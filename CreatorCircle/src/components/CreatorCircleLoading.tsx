import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface CreatorCircleLoadingProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  overlay?: boolean;
}

const CreatorCircleLoading: React.FC<CreatorCircleLoadingProps> = ({
  message = 'Loading...',
  size = 'medium',
  overlay = false,
}) => {
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Spin animation
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.2,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    spinAnimation.start();
    pulseAnimation.start();

    return () => {
      spinAnimation.stop();
      pulseAnimation.stop();
    };
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getSizes = () => {
    switch (size) {
      case 'small':
        return { container: 80, logo: 32, text: 14 };
      case 'large':
        return { container: 120, logo: 48, text: 18 };
      default:
        return { container: 100, logo: 40, text: 16 };
    }
  };

  const sizes = getSizes();

  const containerStyle = overlay
    ? [styles.overlayContainer, { opacity: fadeValue }]
    : [styles.container, { opacity: fadeValue }];

  return (
    <Animated.View style={containerStyle}>
      <View style={styles.content}>
        {/* Animated Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              width: sizes.container,
              height: sizes.container,
              transform: [{ scale: pulseValue }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.spinningRing,
              {
                width: sizes.container,
                height: sizes.container,
                borderRadius: sizes.container / 2,
                transform: [{ rotate: spin }],
              },
            ]}
          />
          <View style={styles.logoCenter}>
            <Ionicons
              name="people"
              size={sizes.logo}
              color="#007AFF"
            />
          </View>
        </Animated.View>

        {/* Brand Text */}
        <Text style={[styles.brandText, { fontSize: sizes.text + 4 }]}>
          CreatorCircle
        </Text>

        {/* Loading Message */}
        <Text style={[styles.messageText, { fontSize: sizes.text }]}>
          {message}
        </Text>

        {/* Loading Dots */}
        <View style={styles.dotsContainer}>
          {[0, 1, 2].map((index) => (
            <AnimatedDot key={index} delay={index * 200} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
};

const AnimatedDot: React.FC<{ delay: number }> = ({ delay }) => {
  const bounceValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(bounceValue, {
          toValue: 1,
          duration: 600,
          easing: Easing.bounce,
          useNativeDriver: true,
        }),
        Animated.timing(bounceValue, {
          toValue: 0,
          duration: 600,
          easing: Easing.bounce,
          useNativeDriver: true,
        }),
      ])
    );

    bounceAnimation.start();

    return () => bounceAnimation.stop();
  }, [delay]);

  const translateY = bounceValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          transform: [{ translateY }],
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 249, 250, 0.95)',
    zIndex: 1000,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  spinningRing: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: '#007AFF',
    borderRightColor: '#007AFF',
  },
  logoCenter: {
    backgroundColor: 'white',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  brandText: {
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  messageText: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginHorizontal: 3,
  },
});

export default CreatorCircleLoading; 