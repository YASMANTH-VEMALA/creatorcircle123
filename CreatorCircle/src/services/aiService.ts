import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../config/firebase';

const functions = getFunctions(app as any);

export async function getChatSuggestionsClient(otherUserId: string): Promise<string[]> {
	try {
		const callable = httpsCallable(functions, 'getChatSuggestions');
		const res: any = await callable({ otherUserId });
		const suggestions = (res?.data?.suggestions || []) as string[];
		return suggestions.filter((s) => typeof s === 'string' && s.trim().length > 0).slice(0, 3);
	} catch (e) {
		console.warn('getChatSuggestionsClient error', e);
		return [];
	}
} 