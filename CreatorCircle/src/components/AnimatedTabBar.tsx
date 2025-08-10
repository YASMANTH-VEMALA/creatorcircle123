import React, { useEffect, useRef } from 'react';
import { View, Animated, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useScroll } from '../contexts/ScrollContext';
import NotificationIndicator from './NotificationIndicator';

const AnimatedTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const { addScrollListener, removeScrollListener } = useScroll();

  // Listen to scroll events from screens
  useEffect(() => {
    const handleScroll = (scrollY: number) => {
      // Hide tab bar when scrolling down (any amount)
      if (scrollY > lastScrollY.current && scrollY > 5) {
        Animated.timing(translateY, {
          toValue: 150, // Move further down to completely hide
          duration: 150, // Faster animation
          useNativeDriver: true,
        }).start();
      }
      
      // Show tab bar when scrolling up or at top
      if (scrollY < lastScrollY.current || scrollY <= 5) {
        Animated.timing(translateY, {
          toValue: 0,
          duration: 150, // Faster animation
          useNativeDriver: true,
        }).start();
      }
      
      lastScrollY.current = scrollY;
      
      // Clear existing timeout
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
      
      // Show tab bar after scrolling stops (faster)
      scrollTimeout.current = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200, // Fast return animation
          useNativeDriver: true,
        }).start();
      }, 100); // Reduced delay for faster response
    };

    addScrollListener(handleScroll);
    
    return () => {
      removeScrollListener(handleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, [addScrollListener, removeScrollListener, translateY]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined
          ? options.tabBarLabel
          : options.title !== undefined
          ? options.title
          : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        let iconName: keyof typeof Ionicons.glyphMap;
        if (route.name === 'Home') {
          iconName = isFocused ? 'home' : 'home-outline';
        } else if (route.name === 'FindPeople') {
          iconName = isFocused ? 'people' : 'people-outline';
        } else if (route.name === 'Post') {
          iconName = isFocused ? 'add-circle' : 'add-circle-outline';
        } else if (route.name === 'More') {
          iconName = isFocused ? 'menu' : 'menu-outline';
        } else if (route.name === 'Profile') {
          iconName = isFocused ? 'person' : 'person-outline';
        } else {
          iconName = 'help-outline';
        }

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tab}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name={iconName}
                size={24}
                color={isFocused ? '#007AFF' : 'gray'}
              />
              {route.name === 'More' && (
                <NotificationIndicator size="small" showCount={false} />
              )}
            </View>
            <Text style={[styles.label, { color: isFocused ? '#007AFF' : 'gray' }]}>
              {typeof label === 'string' ? label : route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 1)',
    borderTopWidth: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
    borderRadius: 25,
    marginHorizontal: 16,
    marginBottom: 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
});

export default AnimatedTabBar; 