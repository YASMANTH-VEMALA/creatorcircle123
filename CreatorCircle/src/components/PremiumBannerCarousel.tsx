import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Banner } from '../types';

const { width } = Dimensions.get('window');

interface PremiumBannerCarouselProps {
  banners: Banner[];
  height?: number;
  showIndicators?: boolean;
  showNavigation?: boolean;
  autoRotate?: boolean;
  showAutoRotateControl?: boolean;
  onBannerPress?: (banner: Banner) => void;
}

const PremiumBannerCarousel: React.FC<PremiumBannerCarouselProps> = ({ 
  banners, 
  height = 200, 
  showIndicators = false, // Changed default to false
  showNavigation = false, // Changed default to false
  autoRotate = true, 
  showAutoRotateControl = false,
  onBannerPress 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(autoRotate);
  
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const autoRotateTimer = useRef<NodeJS.Timeout | null>(null);

  // Filter only active banners
  const activeBanners = banners.filter(banner => banner.isActive);
  
  if (activeBanners.length === 0) {
    return null;
  }

  // Auto-rotate banners every 5 seconds
  useEffect(() => {
    if (!autoRotate || activeBanners.length <= 1) return;

    const startAutoRotation = () => {
      autoRotateTimer.current = setInterval(() => {
        if (isAutoRotating) {
          nextBanner();
        }
      }, 5000);
    };

    startAutoRotation();

    return () => {
      if (autoRotateTimer.current) {
        clearInterval(autoRotateTimer.current);
      }
    };
  }, [currentIndex, isAutoRotating, activeBanners.length, autoRotate]);

  // Pause auto-rotation when user interacts
  const pauseAutoRotation = () => {
    setIsAutoRotating(false);
    if (autoRotateTimer.current) {
      clearInterval(autoRotateTimer.current);
    }
  };

  // Resume auto-rotation after user interaction
  const resumeAutoRotation = () => {
    setIsAutoRotating(true);
  };

  const nextBanner = () => {
    if (activeBanners.length <= 1) return;
    
    const nextIndex = (currentIndex + 1) % activeBanners.length;
    animateBannerChange(nextIndex, 'next');
  };

  const previousBanner = () => {
    if (activeBanners.length <= 1) return;
    
    const prevIndex = currentIndex === 0 ? activeBanners.length - 1 : currentIndex - 1;
    animateBannerChange(prevIndex, 'prev');
  };

  const goToBanner = (index: number) => {
    if (index === currentIndex) return;
    
    const direction = index > currentIndex ? 'next' : 'prev';
    animateBannerChange(index, direction);
  };

  const animateBannerChange = (newIndex: number, direction: 'next' | 'prev') => {
    // Fade out current banner
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // Slide animation
      const slideValue = direction === 'next' ? -width : width;
      slideAnim.setValue(slideValue);
      
      setCurrentIndex(newIndex);
      
      // Fade in new banner
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleBannerPress = () => {
    if (onBannerPress && activeBanners[currentIndex]) {
      onBannerPress(activeBanners[currentIndex]);
    }
  };

  return (
    <View style={[styles.container, { height }]}>
      {/* Banner Display */}
      <View style={styles.bannerContainer}>
        {activeBanners.length > 0 && (
          <Animated.View
            style={{
              flex: 1,
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            }}
          >
            <TouchableOpacity
              style={styles.bannerTouchable}
              onPress={handleBannerPress}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: activeBanners[currentIndex].imageUrl }}
                style={[styles.bannerImage, { height }]}
                contentFit="cover"
                cachePolicy="disk"
                transition={200}
              />
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {/* Navigation Arrows */}
      {showNavigation && activeBanners.length > 1 && (
        <>
          <TouchableOpacity
            style={[styles.navButton, styles.prevButton]}
            onPress={() => {
              pauseAutoRotation();
              previousBanner();
              setTimeout(resumeAutoRotation, 2000);
            }}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.navButton, styles.nextButton]}
            onPress={() => {
              pauseAutoRotation();
              nextBanner();
              setTimeout(resumeAutoRotation, 2000);
            }}
          >
            <Ionicons name="chevron-forward" size={24} color="white" />
          </TouchableOpacity>
        </>
      )}

      {/* Indicators */}
      {showIndicators && activeBanners.length > 1 && (
        <View style={styles.indicatorsContainer}>
          {activeBanners.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.indicator,
                index === currentIndex && styles.activeIndicator,
              ]}
              onPress={() => {
                pauseAutoRotation();
                goToBanner(index);
                setTimeout(resumeAutoRotation, 2000);
              }}
            />
          ))}
        </View>
      )}

      {/* Auto-rotation Status */}
      {showAutoRotateControl && activeBanners.length > 1 && (
        <View style={styles.autoRotateStatus}>
          <TouchableOpacity
            style={styles.autoRotateButton}
            onPress={() => {
              if (isAutoRotating) {
                pauseAutoRotation();
              } else {
                resumeAutoRotation();
              }
            }}
          >
            <Ionicons
              name={isAutoRotating ? 'pause' : 'play'}
              size={16}
              color="white"
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  bannerContainer: {
    flex: 1,
    position: 'relative',
  },
  bannerTouchable: {
    flex: 1,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    borderBottomLeftRadius: 0, // Squared bottom left corner
    borderBottomRightRadius: 0, // Squared bottom right corner
    borderTopLeftRadius: 12, // Keep top corners rounded
    borderTopRightRadius: 12, // Keep top corners rounded
  },
  navigationContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  prevButton: {
    position: 'absolute',
    left: 16,
    top: '50%',
    marginTop: -20,
  },
  nextButton: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -20,
  },
  navButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  indicatorsContainer: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: 'white',
  },
  autoRotateStatus: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  autoRotateButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  autoRotateText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
  },
});

export default PremiumBannerCarousel; 