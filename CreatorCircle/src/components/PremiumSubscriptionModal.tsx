import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { PremiumService } from '../services/premiumService';

const { width } = Dimensions.get('window');

interface PremiumSubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
  onSubscriptionPurchased: () => void;
}

const PremiumSubscriptionModal: React.FC<PremiumSubscriptionModalProps> = ({
  visible,
  onClose,
  onSubscriptionPurchased,
}) => {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium'>('basic');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [userSubscription, setUserSubscription] = useState<any>(null);

  const plans = PremiumService.getSubscriptionPlans();

  useEffect(() => {
    if (visible && user?.uid) {
      loadUserSubscription();
    }
  }, [visible, user]);

  const loadUserSubscription = async () => {
    if (!user?.uid) return;
    
    try {
      const subscription = await PremiumService.getUserSubscription(user.uid);
      setUserSubscription(subscription);
    } catch (error) {
      console.error('Error loading user subscription:', error);
    }
  };

  const handlePurchase = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    const plan = plans.find(p => p.id === selectedPlan);
    if (!plan) return;

    setIsPurchasing(true);

    try {
      const result = await PremiumService.purchaseSubscription(
        user.uid,
        selectedPlan,
        plan.couponCode
      );

      if (result.success) {
        // Refresh user data after successful purchase
        await loadUserSubscription();
        
        Alert.alert(
          '🎉 Subscription Successful!',
          `${result.message}\n\nYou now have a ${plan.badge} verified badge!\n\nPlease refresh the app to see your badge everywhere.`,
          [
            {
              text: 'Great!',
              onPress: () => {
                onSubscriptionPurchased();
                onClose();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Error purchasing subscription:', error);
      Alert.alert('Error', 'Failed to purchase subscription. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user?.uid) return;

    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will lose your verified badge.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await PremiumService.cancelSubscription(user.uid);
              Alert.alert('Subscription Cancelled', result.message);
              loadUserSubscription();
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel subscription.');
            }
          }
        }
      ]
    );
  };

  const renderPlanCard = (plan: any) => {
    const isSelected = selectedPlan === plan.id;
    const isCurrentPlan = userSubscription?.planType === plan.id && userSubscription?.isActive;

    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles.planCard,
          isSelected && styles.selectedPlanCard,
          isCurrentPlan && styles.currentPlanCard
        ]}
        onPress={() => setSelectedPlan(plan.id as 'basic' | 'premium')}
        disabled={isCurrentPlan}
      >
        {isCurrentPlan && (
          <View style={styles.currentPlanBadge}>
            <Text style={styles.currentPlanText}>Current Plan</Text>
          </View>
        )}
        
        <View style={styles.planHeader}>
          <View style={styles.planIconContainer}>
            <Ionicons 
              name={plan.badge === 'gold' ? 'star' : 'shield-checkmark'} 
              size={32} 
              color={plan.badge === 'gold' ? '#FFD700' : '#C0C0C0'} 
            />
          </View>
          <View style={styles.planInfo}>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planBadge}>
              {plan.badge === 'gold' ? '🥇 Gold' : '🥈 Silver'} Verified Badge
            </Text>
          </View>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.price}>₹{plan.price}</Text>
          <Text style={styles.pricePeriod}>/month</Text>
          {plan.couponCode && (
            <View style={styles.couponBadge}>
              <Text style={styles.couponText}>FREE with code: {plan.couponCode}</Text>
            </View>
          )}
        </View>

        <View style={styles.featuresList}>
          {plan.features.map((feature: string, index: number) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {isSelected && !isCurrentPlan && (
          <View style={styles.selectedIndicator}>
            <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={isPurchasing}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Premium Subscription</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <View style={styles.welcomeIcon}>
              <Ionicons name="diamond" size={48} color="#007AFF" />
            </View>
            <Text style={styles.welcomeTitle}>Unlock Premium Features</Text>
            <Text style={styles.welcomeSubtitle}>
              Get verified badges and exclusive features to stand out in the CreatorCircle community
            </Text>
          </View>

          {/* Current Subscription Status */}
          {userSubscription && userSubscription.isActive && (
            <View style={styles.currentSubscriptionCard}>
              <View style={styles.currentSubscriptionHeader}>
                <Ionicons 
                  name={userSubscription.verifiedBadge === 'gold' ? 'star' : 'shield-checkmark'} 
                  size={24} 
                  color={userSubscription.verifiedBadge === 'gold' ? '#FFD700' : '#C0C0C0'} 
                />
                <Text style={styles.currentSubscriptionTitle}>
                  Current Plan: {userSubscription.planType === 'premium' ? 'Premium Pro' : 'Basic Premium'}
                </Text>
              </View>
              <Text style={styles.currentSubscriptionBadge}>
                {userSubscription.verifiedBadge === 'gold' ? '🥇 Gold' : '🥈 Silver'} Verified Badge
              </Text>
              <Text style={styles.currentSubscriptionExpiry}>
                Expires: {userSubscription.endDate.toLocaleDateString()}
              </Text>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={handleCancelSubscription}
              >
                <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Plans */}
          <View style={styles.plansSection}>
            <Text style={styles.plansTitle}>Choose Your Plan</Text>
            {plans.map(renderPlanCard)}
          </View>

          {/* Purchase Button */}
          {(!userSubscription || !userSubscription.isActive) && (
            <TouchableOpacity
              style={[styles.purchaseButton, isPurchasing && styles.purchaseButtonDisabled]}
              onPress={handlePurchase}
              disabled={isPurchasing}
            >
              {isPurchasing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Text style={styles.purchaseButtonText}>
                    Get {selectedPlan === 'premium' ? 'Premium Pro' : 'Basic Premium'} - FREE
                  </Text>
                  <Text style={styles.purchaseButtonSubtext}>
                    Use coupon code: {selectedPlan === 'premium' ? 'CCFREE499' : 'CCFREE199'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>What You Get:</Text>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.infoText}>Verified badge displayed on your profile, posts, and chats</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.infoText}>Enhanced visibility and credibility in the community</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.infoText}>Priority support and exclusive features</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  welcomeSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 24,
  },
  welcomeIcon: {
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  currentSubscriptionCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  currentSubscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentSubscriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  currentSubscriptionBadge: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  currentSubscriptionExpiry: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  plansSection: {
    marginBottom: 24,
  },
  plansTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  selectedPlanCard: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  currentPlanCard: {
    borderColor: '#4CAF50',
    backgroundColor: '#f0fff0',
  },
  currentPlanBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentPlanText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  planBadge: {
    fontSize: 14,
    color: '#666',
  },
  priceContainer: {
    marginBottom: 16,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  pricePeriod: {
    fontSize: 16,
    color: '#666',
  },
  couponBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  couponText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  featuresList: {
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  purchaseButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  purchaseButtonDisabled: {
    backgroundColor: '#ccc',
  },
  purchaseButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  purchaseButtonSubtext: {
    color: 'white',
    fontSize: 14,
    marginTop: 4,
    opacity: 0.9,
  },
  infoSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
});

export default PremiumSubscriptionModal; 