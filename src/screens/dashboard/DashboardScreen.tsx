import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, useTheme } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';
import { SafeAreaView } from 'react-native-safe-area-context';
import PersonalizedGreeting from '../../components/ui/PersonalizedGreeting';
import ActivityPrompt from '../../components/ui/ActivityPrompt';
import { GradientBackground } from '../../components/ui/GradientBackground';
import LargeText from '../../components/ui/LargeText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AnimatedCard } from '../../components/AnimatedCard';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../App';

const DashboardScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  
  // Mock data - in a real app, this would come from an API or context
  const activities = [
    { title: 'Memory Game', description: 'Play a simple memory matching game' },
    { title: 'Daily Question', description: 'Answer a question about your past' },
    { title: 'Photo Memories', description: 'Look at photos from your collection' },
  ];

  const upcomingReminders = [
    { title: 'Medication', time: '12:30 PM', icon: 'pill' as const },
    { title: 'Lunch', time: '1:00 PM', icon: 'food-apple' as const },
    { title: 'Family Call', time: '3:00 PM', icon: 'phone' as const },
  ];
  
  const handleStartConversation = () => {
    navigation.navigate('ChatbotCall');
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animatable.View animation="fadeInDown" duration={1000}>
            <PersonalizedGreeting name="Susan" />
          </Animatable.View>
          
          <View style={styles.sectionContainer}>
            <LargeText style={styles.sectionTitle}>Today's Reminders</LargeText>
            <Card style={styles.reminderCard}>
              <Card.Content>
                {upcomingReminders.map((reminder, index) => (
                  <View key={index} style={styles.reminderItem}>
                    <MaterialCommunityIcons 
                      name={reminder.icon} 
                      size={24} 
                      color={theme.colors.primary} 
                    />
                    <View style={styles.reminderText}>
                      <Text variant="titleMedium">{reminder.title}</Text>
                      <Text variant="bodyMedium">{reminder.time}</Text>
                    </View>
                  </View>
                ))}
              </Card.Content>
            </Card>
          </View>
          
          <View style={styles.sectionContainer}>
            <LargeText style={styles.sectionTitle}>Daily Activities</LargeText>
            <View style={styles.cardsContainer}>
              {activities.map((activity, index) => (
                <View key={index} style={styles.cardContainer}>
                  <AnimatedCard 
                    delay={index * 100}
                  >
                    <Card.Content>
                      <MaterialCommunityIcons 
                        name={index === 0 ? "brain" : index === 1 ? "comment-question" : "image-multiple"}
                        size={32}
                        color={theme.colors.primary}
                        style={styles.icon}
                      />
                      <Text variant="titleLarge" style={styles.cardTitle}>{activity.title}</Text>
                      <Text variant="bodyMedium" style={styles.cardDescription}>{activity.description}</Text>
                    </Card.Content>
                    <Card.Actions style={styles.cardActions}>
                      <Button mode="contained" style={styles.actionButton}>Start</Button>
                    </Card.Actions>
                  </AnimatedCard>
                </View>
              ))}
            </View>
          </View>
          
          <View style={styles.sectionContainer}>
            <LargeText style={styles.sectionTitle}>How are you feeling today?</LargeText>
            <ActivityPrompt prompt="Tell me about your day so far." />
          </View>
          
          <View style={styles.sectionContainer}>
            <Card style={styles.chatCard}>
              <Card.Content>
                <MaterialCommunityIcons 
                  name="chat-processing" 
                  size={32} 
                  color={theme.colors.primary}
                  style={styles.icon} 
                />
                <Text variant="titleLarge" style={styles.cardTitle}>Chat with your companion</Text>
                <Text variant="bodyMedium" style={styles.cardDescription}>
                  Your AI companion is here to talk and help with daily activities
                </Text>
              </Card.Content>
              <Card.Actions style={styles.cardActions}>
                <Button 
                  mode="contained" 
                  style={styles.actionButton}
                  onPress={handleStartConversation}
                >
                  Start Conversation
                </Button>
              </Card.Actions>
            </Card>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  topButtonsContainer: {
    alignItems: 'center',
    paddingHorizontal: 8,
    width: '100%',
    marginBottom: 16,
  },
  topButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 200,
    alignSelf: 'center',
    gap: 12,
    flexWrap: 'nowrap',
  },
  sectionContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 500,
    marginBottom: 8,
  },
  chatCard: {
    borderRadius: 16,
    elevation: 2,
  },
  reminderCard: {
    borderRadius: 16,
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
  cardActions: {
    justifyContent: 'center',
    paddingBottom: 16,
  },
  actionButton: {
    borderRadius: 20,
    paddingHorizontal: 16,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reminderText: {
    marginLeft: 12,
  },
});

export default DashboardScreen; 