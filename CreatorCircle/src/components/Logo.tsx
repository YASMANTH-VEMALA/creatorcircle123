import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface LogoProps {
  size?: number;
}

const Logo: React.FC<LogoProps> = ({ size = 120 }) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Outer Circle */}
      <View style={[styles.outerCircle, { width: size, height: size }]}>
        <LinearGradient
          colors={['#007AFF', '#8A2BE2', '#FF6B35']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.outerArc}
        />
        {/* Connection dots */}
        <View style={[styles.dot, styles.dot1]} />
        <View style={[styles.dot, styles.dot2]} />
        <View style={[styles.dot, styles.dot3]} />
      </View>
      
      {/* Inner Circle */}
      <View style={[styles.innerCircle, { width: size * 0.6, height: size * 0.6 }]}>
        <LinearGradient
          colors={['#FF6B35', '#8A2BE2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.innerArc}
        />
        <View style={[styles.dot, styles.dot4]} />
      </View>
      
      {/* Central Triangle */}
      <View style={[styles.triangle, { width: size * 0.3, height: size * 0.3 }]}>
        <LinearGradient
          colors={['#007AFF', '#FF6B35']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.triangleGradient}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  outerCircle: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerArc: {
    width: '100%',
    height: '100%',
    borderRadius: 1000,
    borderWidth: 8,
    borderColor: 'transparent',
    borderTopColor: '#007AFF',
    borderRightColor: '#8A2BE2',
    borderBottomColor: '#FF6B35',
    transform: [{ rotate: '-45deg' }],
  },
  innerCircle: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerArc: {
    width: '100%',
    height: '100%',
    borderRadius: 1000,
    borderWidth: 6,
    borderColor: 'transparent',
    borderBottomColor: '#FF6B35',
    transform: [{ rotate: '45deg' }],
  },
  triangle: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  triangleGradient: {
    width: '100%',
    height: '100%',
    transform: [{ rotate: '45deg' }],
  },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dot1: {
    top: '10%',
    left: '10%',
    backgroundColor: '#007AFF',
  },
  dot2: {
    top: '15%',
    right: '20%',
    backgroundColor: '#8A2BE2',
  },
  dot3: {
    bottom: '20%',
    right: '15%',
    backgroundColor: '#FF6B35',
  },
  dot4: {
    bottom: '10%',
    backgroundColor: '#FF6B35',
  },
});

export default Logo; 