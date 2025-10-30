import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

// Placeholder screens - will be implemented
function SwipeCommander() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Swipe Commander</Text>
      <Text>Group swipe profiles here</Text>
    </View>
  );
}

function BioLab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bio Lab</Text>
      <Text>Edit and vote on bio proposals</Text>
    </View>
  );
}

function ChatReactor() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chat Reactor</Text>
      <Text>React to chats and take over conversations</Text>
    </View>
  );
}

function DateDJ() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Date DJ</Text>
      <Text>Propose dates and vote</Text>
    </View>
  );
}

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
        name="SwipeCommander" 
        component={SwipeCommander}
        options={{ title: 'Swipe' }}
      />
      <Tab.Screen 
        name="BioLab" 
        component={BioLab}
        options={{ title: 'Bio' }}
      />
      <Tab.Screen 
        name="ChatReactor" 
        component={ChatReactor}
        options={{ title: 'Chat' }}
      />
      <Tab.Screen 
        name="DateDJ" 
        component={DateDJ}
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
