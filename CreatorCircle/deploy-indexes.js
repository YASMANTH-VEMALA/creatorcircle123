#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');

console.log('🔥 Deploying Firestore indexes...');

// Change to the project directory
process.chdir(path.join(__dirname));

// Deploy indexes
exec('firebase deploy --only firestore:indexes', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error deploying indexes:', error);
    console.error('stderr:', stderr);
    
    console.log('\n📝 Manual Setup Required:');
    console.log('1. Go to https://console.firebase.google.com');
    console.log('2. Select your project');
    console.log('3. Go to Firestore Database → Indexes');
    console.log('4. Create the following composite indexes:');
    
    console.log('\n🔍 Required Indexes:');
    console.log('Collection: chats');
    console.log('Fields: participants (array-contains), updatedAt (desc)');
    
    console.log('\nCollection Group: messages');
    console.log('Fields: chatId (asc), createdAt (asc)');
    
    console.log('\n📚 For more details, see FIREBASE_INDEX_SETUP.md');
    return;
  }
  
  console.log('✅ Indexes deployed successfully!');
  console.log(stdout);
  
  if (stderr) {
    console.log('⚠️ Warnings:', stderr);
  }
  
  console.log('\n🎉 Done! Your chat system should now work without index errors.');
  console.log('💡 Tip: It may take a few minutes for the indexes to become active.');
}); 