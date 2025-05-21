import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, useTheme } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../App';
import * as Animatable from 'react-native-animatable';

type DashboardScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Dashboard'>;

type Props = {
  navigation: DashboardScreenNavigationProp;
};

const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();

  const features = [
    {
      title: 'Chat with AI',
      description: 'Get instant answers to your questions',
      icon: '🤖',
      screen: 'Chatbot',
    },
    {
      title: 'Your Profile',
      description: 'View and edit your profile information',
      icon: '👤',
      screen: 'Profile',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <Animatable.View animation="fadeInDown" duration={1000}>
        <Text variant="headlineMedium" style={styles.welcome}>
          Welcome to Momenko
        </Text>
      </Animatable.View>

      <View style={styles.featuresContainer}>
        {features.map((feature, index) => (
          <Animatable.View
            key={feature.title}
            animation="fadeInUp"
            delay={index * 200}
          >
            <Card
              style={styles.card}
              onPress={() => navigation.navigate(feature.screen as keyof RootStackParamList)}
            >
              <Card.Content>
                <Text variant="displaySmall" style={styles.icon}>
                  {feature.icon}
                </Text>
                <Text variant="titleLarge" style={styles.cardTitle}>
                  {feature.title}
                </Text>
                <Text variant="bodyMedium" style={styles.cardDescription}>
                  {feature.description}
                </Text>
              </Card.Content>
            </Card>
          </Animatable.View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  welcome: {
    padding: 24,
    textAlign: 'center',
  },
  featuresContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  icon: {
    textAlign: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  cardDescription: {
    textAlign: 'center',
    opacity: 0.7,
  },
});

export default DashboardScreen; 