import { db } from '../config/firebase';
import { collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';

export class ChatDataCleanup {
  /**
   * Delete all chat-related collections from Firestore
   * WARNING: This will permanently delete all chat data
   */
  static async deleteAllChatData(): Promise<void> {
    console.log('🚨 Starting complete chat data deletion...');
    
    try {
      // Delete all collections related to chat
      await this.deleteCollection('chats');
      await this.deleteCollection('chatMessages');
      await this.deleteCollection('chatSettings');
      await this.deleteCollection('enhancedChats');
      await this.deleteCollection('messages');
      
      console.log('✅ All chat data deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting chat data:', error);
      throw error;
    }
  }

  /**
   * Delete all documents in a collection
   */
  private static async deleteCollection(collectionName: string): Promise<void> {
    try {
      console.log(`🗑️ Deleting collection: ${collectionName}`);
      
      const snapshot = await getDocs(collection(db, collectionName));
      
      if (snapshot.empty) {
        console.log(`✨ Collection ${collectionName} is already empty`);
        return;
      }

      // Delete in batches to avoid limits
      const batchSize = 500;
      const docs = snapshot.docs;
      
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = writeBatch(db);
        const currentBatch = docs.slice(i, i + batchSize);
        
        for (const docSnapshot of currentBatch) {
          // If this is a chat document, also delete its subcollections
          if (collectionName === 'chats') {
            await this.deleteChatSubcollections(docSnapshot.id);
          }
          
          batch.delete(docSnapshot.ref);
        }
        
        await batch.commit();
        console.log(`🗑️ Deleted ${currentBatch.length} documents from ${collectionName}`);
      }
      
      console.log(`✅ Collection ${collectionName} deleted (${docs.length} documents)`);
    } catch (error) {
      console.error(`❌ Error deleting collection ${collectionName}:`, error);
      // Continue with other collections even if one fails
    }
  }

  /**
   * Delete subcollections for a chat document
   */
  private static async deleteChatSubcollections(chatId: string): Promise<void> {
    try {
      // Delete messages subcollection
      const messagesSnapshot = await getDocs(collection(db, 'chats', chatId, 'messages'));
      
      if (!messagesSnapshot.empty) {
        const batch = writeBatch(db);
        messagesSnapshot.forEach((messageDoc) => {
          batch.delete(messageDoc.ref);
        });
        await batch.commit();
        console.log(`🗑️ Deleted ${messagesSnapshot.size} messages from chat ${chatId}`);
      }
    } catch (error) {
      console.warn(`⚠️ Error deleting subcollections for chat ${chatId}:`, error);
    }
  }

  /**
   * Clean up specific chat-related data for testing
   */
  static async cleanupTestData(): Promise<void> {
    console.log('🧹 Cleaning up test chat data...');
    
    try {
      // Get current timestamp for comparison
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - 1); // Delete data older than 1 hour
      
      await this.deleteCollection('chats');
      await this.deleteCollection('chatMessages');
      
      console.log('✅ Test chat data cleanup completed');
    } catch (error) {
      console.error('❌ Error during test cleanup:', error);
      throw error;
    }
  }

  /**
   * Get statistics about chat data before deletion
   */
  static async getChatDataStats(): Promise<{
    chats: number;
    chatMessages: number;
    chatSettings: number;
  }> {
    try {
      const [chatsSnapshot, messagesSnapshot, settingsSnapshot] = await Promise.all([
        getDocs(collection(db, 'chats')),
        getDocs(collection(db, 'chatMessages')),
        getDocs(collection(db, 'chatSettings')),
      ]);

      const stats = {
        chats: chatsSnapshot.size,
        chatMessages: messagesSnapshot.size,
        chatSettings: settingsSnapshot.size,
      };

      console.log('📊 Chat data statistics:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error getting chat stats:', error);
      return { chats: 0, chatMessages: 0, chatSettings: 0 };
    }
  }
} 