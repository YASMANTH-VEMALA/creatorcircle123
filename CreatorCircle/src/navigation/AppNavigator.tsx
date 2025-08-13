import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AnimatedTabBar from '../components/AnimatedTabBar';
import { ScrollProvider } from '../contexts/ScrollContext';

import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FindPeopleScreen from '../screens/FindPeopleScreen';
import PostScreen from '../screens/PostScreen';
import PostViewScreen from '../screens/PostViewScreen';
import MoreScreen from '../screens/MoreScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';
import CollaborationRequestsScreen from '../screens/CollaborationRequestsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import PlatformCompatibilityTest from '../components/PlatformCompatibilityTest';
import LoadingScreen from '../components/LoadingScreen';
import AvatarDemo from '../components/ui/AvatarDemo';
import SuggestedPeopleScreen from '../screens/SuggestedPeopleScreen';
import NearbyCreatorsScreen from '../screens/NearbyCreatorsScreen';
import { RootStackParamList } from '../types';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import LocationSettingsScreen from '../screens/LocationSettingsScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
  </Stack.Navigator>
);

const MainTabNavigator = () => (
  <Tab.Navigator
    tabBar={props => <AnimatedTabBar {...props} />}
    screenOptions={{
      headerShown: false,
    }}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="FindPeople" component={FindPeopleScreen} />
    <Tab.Screen name="Post" component={PostScreen} />
    <Tab.Screen name="More" component={MoreScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Initializing CreatorCircle..." />;
  }

  return (
    <ScrollProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <>
              <Stack.Screen name="Main" component={MainTabNavigator} />
              <Stack.Screen name="UserProfile" component={UserProfileScreen} />
              <Stack.Screen name="PostView" component={PostViewScreen} />
              <Stack.Screen name="ChatList" component={ChatListScreen} />
              <Stack.Screen name="Chat" component={ChatScreen} />
              <Stack.Screen name="CollaborationRequests" component={CollaborationRequestsScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="PlatformTest" component={PlatformCompatibilityTest} />
              <Stack.Screen name="AvatarDemo" component={AvatarDemo} />
              <Stack.Screen name="SuggestedPeople" component={SuggestedPeopleScreen} />
              <Stack.Screen name="NearbyCreators" component={NearbyCreatorsScreen} />
              <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
              <Stack.Screen name="LocationSettings" component={LocationSettingsScreen} />
              <Stack.Screen name="RoomsList" component={require('../screens/RoomsListScreen').default} />
              <Stack.Screen name="CreateRoom" component={require('../screens/CreateRoomScreen').default} />
              <Stack.Screen name="RoomChat" component={require('../screens/RoomChatScreen').default} />
            </>
          ) : (
            <Stack.Screen name="Auth" component={AuthStack} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </ScrollProvider>
  );
};

export default AppNavigator; 