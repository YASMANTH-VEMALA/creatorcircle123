import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

if (!admin.apps.length) {
	admin.initializeApp();
}

const db = admin.firestore();

async function fetchRecentMessages(userId: string, otherUserId: string, limitPerSide: number = 10) {
	// Fetch last N messages in both directions and merge
	const aToB = await db
		.collection('chatMessages')
		.where('senderId', '==', userId)
		.where('receiverId', '==', otherUserId)
		.orderBy('timestamp', 'desc')
		.limit(limitPerSide)
		.get();

	const bToA = await db
		.collection('chatMessages')
		.where('senderId', '==', otherUserId)
		.where('receiverId', '==', userId)
		.orderBy('timestamp', 'desc')
		.limit(limitPerSide)
		.get();

	const combined = [...aToB.docs, ...bToA.docs]
		.map((d) => ({ id: d.id, ...(d.data() as any) }))
		.sort((m1, m2) => {
			const t1 = m1.timestamp?.toMillis ? m1.timestamp.toMillis() : (m1.timestamp?.seconds ? m1.timestamp.seconds * 1000 : 0);
			const t2 = m2.timestamp?.toMillis ? m2.timestamp.toMillis() : (m2.timestamp?.seconds ? m2.timestamp.seconds * 1000 : 0);
			return t1 - t2;
		});

	return combined.slice(-20); // cap to ~20 total
}

function buildPrompt(messages: any[], currentUserId: string) {
	const transcript = messages
		.map((m) => `${m.senderId === currentUserId ? 'Me' : 'Them'}: ${m.message}`)
		.join('\n');

	return `You are a helpful assistant that suggests the next messages in a friendly chat between two people.
Given the recent conversation, suggest the next 3 natural, engaging replies the user (Me) could send.

Guidelines:
- Keep replies short, casual, and friendly.
- Move the conversation forward; avoid repeating earlier questions.
- Do NOT include quotes or metadata; no emojis unless context suggests.
- Tailor to the flow of the chat. If they discussed plans, propose a simple next step.
- Return ONLY a JSON array of 3 strings, nothing else.

Conversation:
${transcript}

Output strictly as JSON array of strings.`;
}

async function callGemini(prompts: string): Promise<string[]> {
	const apiKey = process.env.GEMINI_API_KEY || (functions.config()?.gemini?.key as string | undefined);
	if (!apiKey) {
		console.warn('Gemini API key not configured');
		return [];
	}

	const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;
	const body = {
		contents: [
			{
				role: 'user',
				parts: [{ text: prompts }],
			},
		],
	};

	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});

	if (!res.ok) {
		console.error('Gemini API error', await res.text());
		return [];
	}
	const data: any = await res.json();
	const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
	// Try to parse JSON array from text
	let suggestions: string[] = [];
	try {
		suggestions = JSON.parse(text);
		if (!Array.isArray(suggestions)) suggestions = [];
	} catch (_e) {
		// attempt to extract JSON array
		const match = text.match(/\[[\s\S]*\]/);
		if (match) {
			try {
				suggestions = JSON.parse(match[0]);
			} catch {}
		}
	}

	// sanitize
	suggestions = (suggestions || [])
		.filter((s) => typeof s === 'string' && s.trim().length > 0)
		.map((s) => s.trim())
		.slice(0, 3);
	return suggestions;
}

export const getChatSuggestions = functions.https.onCall(async (data, context) => {
	try {
		const currentUserId = context.auth?.uid;
		if (!currentUserId) {
			throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
		}
		const otherUserId = (data?.otherUserId as string) || '';
		if (!otherUserId) {
			throw new functions.https.HttpsError('invalid-argument', 'otherUserId is required');
		}

		const recent = await fetchRecentMessages(currentUserId, otherUserId, 10);
		const prompt = buildPrompt(recent, currentUserId);
		const suggestions = await callGemini(prompt);

		return { suggestions };
	} catch (e: any) {
		console.error('getChatSuggestions error', e);
		throw new functions.https.HttpsError('internal', e?.message || 'Failed to get suggestions');
	}
}); 