import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { SleepLogScreen } from '../screens/SleepLogScreen';
import { TimelineScreen } from '../screens/TimelineScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { CoachScreen } from '../screens/CoachScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { CustomTabBar } from '../components/navigation/CustomTabBar';

const Tab = createBottomTabNavigator();

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen name="Log" component={SleepLogScreen} />
        <Tab.Screen name="Timeline" component={TimelineScreen} />
        <Tab.Screen name="Schedule" component={ScheduleScreen} />
        <Tab.Screen name="Coach" component={CoachScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
