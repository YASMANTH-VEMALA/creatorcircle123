import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { SuggestedPeopleService, SuggestedUser } from '../services/suggestedPeopleService';
import SuggestedPeopleCard from '../components/SuggestedPeopleCard';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const cardsPerRow = isMobile ? 2 : 4;

const SuggestedPeopleScreen: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collegeFilter, setCollegeFilter] = useState(true);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [allSkills, setAllSkills] = useState<string[]>([]);
  const [allInterests, setAllInterests] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const loadSuggestedPeople = useCallback(async () => {
    if (!currentUser?.uid) return;

    try {
      setLoading(true);
      const users = await SuggestedPeopleService.getSuggestedPeople(currentUser.uid, {
        collegeFilter,
        searchQuery,
        skillFilters: selectedSkills,
        interestFilters: selectedInterests,
        limit: 20,
      });
      setSuggestedUsers(users);
    } catch (error) {
      console.error('Error loading suggested people:', error);
      // Don't show alert for now, just log the error
      setSuggestedUsers([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid, collegeFilter, searchQuery, selectedSkills, selectedInterests]);

  const loadFilters = useCallback(async () => {
    try {
      const [skills, interests] = await Promise.all([
        SuggestedPeopleService.getAllSkills(),
        SuggestedPeopleService.getAllInterests(),
      ]);
      setAllSkills(skills);
      setAllInterests(interests);
    } catch (error) {
      console.error('Error loading filters:', error);
      // Set empty arrays as fallback
      setAllSkills([]);
      setAllInterests([]);
    }
  }, []);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    loadSuggestedPeople();
  }, [loadSuggestedPeople]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSuggestedPeople();
    setRefreshing(false);
  };

  const handleFollowChange = () => {
    // Refresh the list when someone is followed/unfollowed
    loadSuggestedPeople();
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const clearFilters = () => {
    setSelectedSkills([]);
    setSelectedInterests([]);
    setSearchQuery('');
  };

  const renderFilterChip = (
    item: string,
    isSelected: boolean,
    onToggle: () => void,
    type: 'skill' | 'interest'
  ) => (
    <TouchableOpacity
      key={item}
      style={[styles.filterChip, isSelected && styles.filterChipSelected]}
      onPress={onToggle}
    >
      <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  const renderSuggestedUser = ({ item }: { item: SuggestedUser }) => (
    <SuggestedPeopleCard user={item} onFollowChange={handleFollowChange} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No suggestions found</Text>
      <Text style={styles.emptyStateSubtitle}>
        Try adjusting your search or filters to find more people
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Suggested People</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="filter" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, skill, or interest..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      {showFilters && (
        <ScrollView style={styles.filtersContainer} horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>College Filter</Text>
            <TouchableOpacity
              style={[styles.collegeFilter, collegeFilter && styles.collegeFilterActive]}
              onPress={() => setCollegeFilter(!collegeFilter)}
            >
              <Text style={[styles.collegeFilterText, collegeFilter && styles.collegeFilterTextActive]}>
                {collegeFilter ? 'Same College' : 'All Colleges'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Skills</Text>
            <View style={styles.filterChips}>
              {allSkills.slice(0, 10).map(skill =>
                renderFilterChip(
                  skill,
                  selectedSkills.includes(skill),
                  () => toggleSkill(skill),
                  'skill'
                )
              )}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Interests</Text>
            <View style={styles.filterChips}>
              {allInterests.slice(0, 10).map(interest =>
                renderFilterChip(
                  interest,
                  selectedInterests.includes(interest),
                  () => toggleInterest(interest),
                  'interest'
                )
              )}
            </View>
          </View>

          <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
            <Text style={styles.clearFiltersText}>Clear All</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Finding people for you...</Text>
        </View>
      ) : (
        <FlatList
          data={suggestedUsers}
          renderItem={renderSuggestedUser}
          keyExtractor={(item) => item.uid}
          numColumns={cardsPerRow}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    backgroundColor: 'white',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filtersContainer: {
    backgroundColor: 'white',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterSection: {
    marginRight: 20,
    minWidth: 120,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  collegeFilter: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignSelf: 'flex-start',
  },
  collegeFilterActive: {
    backgroundColor: '#007AFF',
  },
  collegeFilterText: {
    fontSize: 12,
    color: '#666',
  },
  collegeFilterTextActive: {
    color: 'white',
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginBottom: 4,
  },
  filterChipSelected: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 12,
    color: '#666',
  },
  filterChipTextSelected: {
    color: 'white',
  },
  clearFiltersButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FF3B30',
    borderRadius: 16,
    alignSelf: 'center',
    marginLeft: 20,
  },
  clearFiltersText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default SuggestedPeopleScreen; 