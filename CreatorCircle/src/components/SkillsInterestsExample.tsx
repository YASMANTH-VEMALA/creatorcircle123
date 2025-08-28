import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SkillsInterestsEditor from './SkillsInterestsEditor';

interface SkillsInterestsExampleProps {
  skills: string[];
  interests: string[];
  onUpdate: (skills: string[], interests: string[]) => void;
}

const SkillsInterestsExample: React.FC<SkillsInterestsExampleProps> = ({
  skills,
  interests,
  onUpdate,
}) => {
  const [showEditor, setShowEditor] = useState(false);

  const handleSave = (newSkills: string[], newInterests: string[]) => {
    onUpdate(newSkills, newInterests);
    setShowEditor(false);
  };

  const renderChips = (items: string[], title: string, emptyMessage: string) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setShowEditor(true)}
        >
          <Ionicons name="pencil" size={16} color="#007AFF" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>
      
      {items.length > 0 ? (
        <View style={styles.chipsContainer}>
          {items.map((item, index) => (
            <View key={index} style={styles.chip}>
              <Text style={styles.chipText}>{item}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyMessage}>{emptyMessage}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {renderChips(
        skills,
        'Skills',
        'No skills added yet. Tap Edit to add your skills!'
      )}
      
      {renderChips(
        interests,
        'Interests',
        'No interests added yet. Tap Edit to add your interests!'
      )}

      {/* Skills & Interests Editor Modal */}
      <Modal
        visible={showEditor}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SkillsInterestsEditor
          visible={showEditor}
          onClose={() => setShowEditor(false)}
          onSave={handleSave}
          initialSkills={skills}
          initialInterests={interests}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f8ff',
    gap: 4,
  },
  editButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default SkillsInterestsExample; 