import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import SwipeScreen from './swipe';
import BioLabScreen from './bio';
import ChatReactorScreen from './chat-reactor';
import DateDJScreen from './date';

const Tab = createBottomTabNavigator();

export default function CrewRoom() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#999',
      }}
    >
      <Tab.Screen 
        name="swipe" 
        component={SwipeScreen}
        options={{ title: 'Swipe' }}
      />
      <Tab.Screen 
        name="bio" 
        component={BioLabScreen}
        options={{ title: 'Bio' }}
      />
      <Tab.Screen 
        name="chat-reactor" 
        component={ChatReactorScreen}
        options={{ title: 'Chat' }}
      />
      <Tab.Screen 
        name="date" 
        component={DateDJScreen}
        options={{ title: 'Dates' }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});
