import { format } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import * as Animatable from "react-native-animatable";
import {
  Button,
  Chip,
  Divider,
  IconButton,
  Menu,
  Modal,
  Portal,
  Searchbar,
  Surface,
  Text,
} from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useCulturalContext } from "../../contexts/CulturalContext";

interface ConversationMessage {
  id: string;
  content: string;
  timestamp: Date;
  isUser: boolean;
  culturalContext?: string;
  emotions?: string[];
  language: "en" | "mi" | "zh";
}

interface ConversationSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  messages: ConversationMessage[];
  culturalProfile: string;
  summary?: string;
  tags?: string[];
}

interface ConversationHistoryProps {
  sessions: ConversationSession[];
  onSessionSelect?: (session: ConversationSession) => void;
  onExportSession?: (session: ConversationSession) => void;
  onShareWithFamily?: (session: ConversationSession) => void;
  isHighContrast?: boolean;
  textSize?: "small" | "medium" | "large" | "extra-large";
  showCulturalIndicators?: boolean;
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  sessions = [],
  onSessionSelect,
  onExportSession,
  onShareWithFamily,
  isHighContrast = false,
  textSize = "large",
  showCulturalIndicators = true,
}) => {
  const {
    culturalProfile,
    getFamilyInvolvementGuidance,
    validateCulturalAppropriateness,
  } = useCulturalContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSession, setSelectedSession] =
    useState<ConversationSession | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "duration" | "cultural">(
    "date"
  );
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<
    "all" | "en" | "mi" | "zh"
  >("all");
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(
    new Set()
  );
  const [menuVisible, setMenuVisible] = useState(false);

  // Cultural colors and styling
  const getCulturalColors = () => {
    const baseColors = isHighContrast
      ? {
          maori: {
            primary: "#000000",
            secondary: "#FFFFFF",
            accent: "#FF0000",
            background: "#FFFFFF",
          },
          chinese: {
            primary: "#000000",
            secondary: "#FFFFFF",
            accent: "#FFD700",
            background: "#FFFFFF",
          },
          western: {
            primary: "#000000",
            secondary: "#FFFFFF",
            accent: "#0066CC",
            background: "#FFFFFF",
          },
        }
      : {
          maori: {
            primary: "#8B4513",
            secondary: "#F5DEB3",
            accent: "#228B22",
            background: "#FFF8DC",
          },
          chinese: {
            primary: "#DC143C",
            secondary: "#FFD700",
            accent: "#FF6347",
            background: "#FFF5EE",
          },
          western: {
            primary: "#6366F1",
            secondary: "#E0E7FF",
            accent: "#8B5CF6",
            background: "#F9FAFB",
          },
        };

    return baseColors[culturalProfile.culturalGroup];
  };

  const colors = getCulturalColors();

  // Text size mappings
  const getTextSizes = () =>
    ({
      small: { title: 18, body: 14, caption: 12 },
      medium: { title: 22, body: 18, caption: 14 },
      large: { title: 26, body: 22, caption: 16 },
      "extra-large": { title: 32, body: 28, caption: 20 },
    }[textSize]);

  const textSizes = getTextSizes();

  // Cultural date formatting
  const getDateLocale = () => {
    switch (culturalProfile.culturalGroup) {
      case "chinese":
        return zhCN;
      default:
        return enUS;
    }
  };

  // Handle session actions
  const handleSessionSelect = useCallback(
    (session: ConversationSession) => {
      Vibration.vibrate(50);
      setSelectedSession(session);
      setShowSessionModal(true);
      onSessionSelect?.(session);
    },
    [onSessionSelect]
  );

  const handleExportSession = useCallback(
    async (session: ConversationSession) => {
      try {
        if (!onExportSession) {
          Alert.alert(
            "Export Not Available",
            "Export functionality is not configured."
          );
          return;
        }

        const validation = validateCulturalAppropriateness(
          session.messages.map((m) => m.content).join(" ")
        );

        if (!validation.isAppropriate) {
          Alert.alert(
            "Cultural Review Required",
            `Please review this conversation before sharing:\n${validation.concerns.join(
              "\n"
            )}`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Export Anyway",
                onPress: () => onExportSession(session),
              },
            ]
          );
          return;
        }

        await onExportSession(session);
      } catch (error) {
        Alert.alert(
          "Export Error",
          "Failed to export conversation. Please try again."
        );
      }
    },
    [onExportSession, validateCulturalAppropriateness]
  );

  const handleShareWithFamily = useCallback(
    async (session: ConversationSession) => {
      try {
        const familyGuidance = getFamilyInvolvementGuidance();

        if (familyGuidance.level === "low") {
          Alert.alert(
            "Privacy Notice",
            "According to your cultural preferences, family sharing is optional. Would you like to proceed?",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Share", onPress: () => onShareWithFamily?.(session) },
            ]
          );
          return;
        }

        if (!onShareWithFamily) {
          // Fallback to native sharing
          const shareContent = `Conversation Summary (${session.startTime.toLocaleDateString()}):\n\n${
            session.summary
          }`;
          await Share.share({
            message: shareContent,
            title: "Conversation Summary",
          });
          return;
        }

        await onShareWithFamily(session);
      } catch (error) {
        Alert.alert(
          "Sharing Error",
          "Failed to share conversation. Please try again."
        );
      }
    },
    [onShareWithFamily, getFamilyInvolvementGuidance]
  );

  // Filter and sort sessions
  const filteredSessions = useMemo(() => {
    let filtered = sessions.filter((session) => {
      // Text search
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matches =
          session.summary?.toLowerCase().includes(searchLower) ||
          session.messages.some((m) =>
            m.content.toLowerCase().includes(searchLower)
          ) ||
          session.tags?.some((tag) => tag.toLowerCase().includes(searchLower));
        if (!matches) return false;
      }

      // Language filter
      if (selectedLanguage !== "all") {
        const hasLanguage = session.messages.some(
          (m) => m.language === selectedLanguage
        );
        if (!hasLanguage) return false;
      }

      // Tag filter
      if (filterTags.length > 0) {
        const hasFilterTag = session.tags?.some((tag) =>
          filterTags.includes(tag)
        );
        if (!hasFilterTag) return false;
      }

      return true;
    });

    // Sort sessions
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return b.startTime.getTime() - a.startTime.getTime();
        case "duration":
          const aDuration = a.endTime
            ? a.endTime.getTime() - a.startTime.getTime()
            : 0;
          const bDuration = b.endTime
            ? b.endTime.getTime() - b.startTime.getTime()
            : 0;
          return bDuration - aDuration;
        case "cultural":
          return a.culturalProfile.localeCompare(b.culturalProfile);
        default:
          return 0;
      }
    });

    return filtered;
  }, [sessions, searchQuery, selectedLanguage, filterTags, sortBy]);

  // Get all available tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    sessions.forEach((session) => {
      session.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet);
  }, [sessions]);

  const toggleSessionExpansion = (sessionId: string) => {
    setExpandedSessions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const formatSessionDuration = (session: ConversationSession) => {
    if (!session.endTime) return "Ongoing";

    const duration = session.endTime.getTime() - session.startTime.getTime();
    const minutes = Math.floor(duration / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const getCulturalIcon = (culturalGroup: string) => {
    switch (culturalGroup) {
      case "maori":
        return "spiral";
      case "chinese":
        return "yin-yang";
      case "western":
        return "account";
      default:
        return "account-circle";
    }
  };

  const renderSessionCard = (session: ConversationSession, index: number) => {
    const isExpanded = expandedSessions.has(session.id);
    const duration = formatSessionDuration(session);

    return (
      <Animatable.View
        key={session.id}
        animation="fadeInUp"
        delay={index * 100}
        style={styles.sessionCard}
      >
        <Surface
          style={[
            styles.sessionSurface,
            { backgroundColor: isHighContrast ? colors.background : "#FFFFFF" },
          ]}
          elevation={2}
        >
          <TouchableOpacity
            style={styles.sessionHeader}
            onPress={() => handleSessionSelect(session)}
            accessibilityRole="button"
            accessibilityLabel={`Conversation from ${format(
              session.startTime,
              "PPP",
              { locale: getDateLocale() }
            )}`}
          >
            <View style={styles.sessionHeaderContent}>
              <View style={styles.sessionTitleRow}>
                {showCulturalIndicators && (
                  <Icon
                    name={getCulturalIcon(session.culturalProfile)}
                    size={24}
                    color={colors.primary}
                    style={styles.culturalIcon}
                  />
                )}
                <View style={styles.sessionInfo}>
                  <Text
                    style={[
                      styles.sessionDate,
                      {
                        fontSize: textSizes.body,
                        color: isHighContrast ? colors.primary : colors.primary,
                      },
                    ]}
                  >
                    {format(session.startTime, "PPP", {
                      locale: getDateLocale(),
                    })}
                  </Text>
                  <Text
                    style={[
                      styles.sessionTime,
                      {
                        fontSize: textSizes.caption,
                        color: isHighContrast ? "#666666" : "#6B7280",
                      },
                    ]}
                  >
                    {format(session.startTime, "p", {
                      locale: getDateLocale(),
                    })}{" "}
                    • {duration} • {session.messages.length} messages
                  </Text>
                </View>
              </View>

              <IconButton
                icon={isExpanded ? "chevron-up" : "chevron-down"}
                size={24}
                onPress={() => toggleSessionExpansion(session.id)}
                accessibilityLabel={
                  isExpanded ? "Collapse session" : "Expand session"
                }
              />
            </View>
          </TouchableOpacity>

          {session.summary && (
            <Text
              style={[
                styles.sessionSummary,
                {
                  fontSize: textSizes.caption,
                  color: isHighContrast ? "#333333" : "#4B5563",
                },
              ]}
            >
              {session.summary}
            </Text>
          )}

          {session.tags && session.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {session.tags.map((tag, tagIndex) => (
                <Chip
                  key={tagIndex}
                  mode="outlined"
                  compact
                  style={[styles.tag, { borderColor: colors.accent }]}
                  textStyle={{ fontSize: textSizes.caption - 2 }}
                >
                  {tag}
                </Chip>
              ))}
            </View>
          )}

          {isExpanded && (
            <Animatable.View
              animation="slideInDown"
              style={styles.expandedContent}
            >
              <Divider style={{ marginVertical: 12 }} />

              <View style={styles.messagesPreview}>
                {session.messages.slice(0, 3).map((message, msgIndex) => (
                  <View key={message.id} style={styles.messagePreview}>
                    <Icon
                      name={message.isUser ? "account" : "robot"}
                      size={16}
                      color={message.isUser ? colors.accent : colors.primary}
                    />
                    <Text
                      style={[
                        styles.messageText,
                        {
                          fontSize: textSizes.caption,
                          color: isHighContrast ? "#333333" : "#6B7280",
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {message.content}
                    </Text>
                  </View>
                ))}
                {session.messages.length > 3 && (
                  <Text
                    style={[
                      styles.moreMessages,
                      {
                        fontSize: textSizes.caption,
                        color: colors.accent,
                      },
                    ]}
                  >
                    +{session.messages.length - 3} more messages
                  </Text>
                )}
              </View>

              <View style={styles.sessionActions}>
                <Button
                  mode="outlined"
                  compact
                  onPress={() => handleExportSession(session)}
                  style={[styles.actionButton, { borderColor: colors.primary }]}
                  labelStyle={{ fontSize: textSizes.caption }}
                  icon="download"
                  accessibilityLabel="Export conversation for healthcare provider"
                >
                  Export
                </Button>
                <Button
                  mode="outlined"
                  compact
                  onPress={() => handleShareWithFamily(session)}
                  style={[styles.actionButton, { borderColor: colors.accent }]}
                  labelStyle={{ fontSize: textSizes.caption }}
                  icon="share-variant"
                  accessibilityLabel="Share conversation with family"
                >
                  Share
                </Button>
              </View>
            </Animatable.View>
          )}
        </Surface>
      </Animatable.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <Searchbar
          placeholder="Search conversations..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[
            styles.searchBar,
            { backgroundColor: isHighContrast ? "#FFFFFF" : "#F3F4F6" },
          ]}
          inputStyle={{ fontSize: textSizes.body }}
          iconColor={colors.primary}
        />

        <View style={styles.filtersRow}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              {
                backgroundColor: showFilters
                  ? colors.primary
                  : isHighContrast
                  ? "#FFFFFF"
                  : "#F3F4F6",
                borderColor: colors.primary,
              },
            ]}
            onPress={() => setShowFilters(!showFilters)}
            accessibilityLabel="Toggle filters"
          >
            <Icon
              name="filter-variant"
              size={20}
              color={showFilters ? "#FFFFFF" : colors.primary}
            />
            <Text
              style={[
                styles.filterButtonText,
                {
                  fontSize: textSizes.caption,
                  color: showFilters ? "#FFFFFF" : colors.primary,
                },
              ]}
            >
              Filters
            </Text>
          </TouchableOpacity>

          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <TouchableOpacity
                style={[
                  styles.sortButton,
                  {
                    backgroundColor: isHighContrast ? "#FFFFFF" : "#F3F4F6",
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setMenuVisible(true)}
                accessibilityLabel="Sort conversations"
              >
                <Icon name="sort" size={20} color={colors.primary} />
                <Text
                  style={[
                    styles.sortButtonText,
                    {
                      fontSize: textSizes.caption,
                      color: colors.primary,
                    },
                  ]}
                >
                  Sort: {sortBy}
                </Text>
              </TouchableOpacity>
            }
          >
            <Menu.Item
              onPress={() => {
                setSortBy("date");
                setMenuVisible(false);
              }}
              title="By Date"
              leadingIcon="calendar"
            />
            <Menu.Item
              onPress={() => {
                setSortBy("duration");
                setMenuVisible(false);
              }}
              title="By Duration"
              leadingIcon="clock"
            />
            <Menu.Item
              onPress={() => {
                setSortBy("cultural");
                setMenuVisible(false);
              }}
              title="By Culture"
              leadingIcon="account-group"
            />
          </Menu>
        </View>

        {showFilters && (
          <Animatable.View animation="slideInDown" style={styles.filtersPanel}>
            <Text
              style={[
                styles.filterTitle,
                {
                  fontSize: textSizes.body,
                  color: colors.primary,
                },
              ]}
            >
              Filter Options
            </Text>

            <View style={styles.languageFilters}>
              {["all", "en", "mi", "zh"].map((lang) => (
                <Chip
                  key={lang}
                  mode={selectedLanguage === lang ? "flat" : "outlined"}
                  selected={selectedLanguage === lang}
                  onPress={() =>
                    setSelectedLanguage(lang as typeof selectedLanguage)
                  }
                  style={[
                    styles.languageChip,
                    selectedLanguage === lang && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  textStyle={{
                    fontSize: textSizes.caption,
                    color:
                      selectedLanguage === lang ? "#FFFFFF" : colors.primary,
                  }}
                >
                  {lang === "all"
                    ? "All Languages"
                    : lang === "en"
                    ? "English"
                    : lang === "mi"
                    ? "Māori"
                    : "中文"}
                </Chip>
              ))}
            </View>

            {allTags.length > 0 && (
              <View style={styles.tagFilters}>
                <Text
                  style={[
                    styles.filterSubtitle,
                    {
                      fontSize: textSizes.caption,
                      color: colors.primary,
                    },
                  ]}
                >
                  Filter by Tags:
                </Text>
                <View style={styles.tagChips}>
                  {allTags.map((tag) => (
                    <Chip
                      key={tag}
                      mode={filterTags.includes(tag) ? "flat" : "outlined"}
                      selected={filterTags.includes(tag)}
                      onPress={() => {
                        setFilterTags((prev) =>
                          prev.includes(tag)
                            ? prev.filter((t) => t !== tag)
                            : [...prev, tag]
                        );
                      }}
                      style={[
                        styles.tagChip,
                        filterTags.includes(tag) && {
                          backgroundColor: colors.accent,
                        },
                      ]}
                      textStyle={{
                        fontSize: textSizes.caption - 2,
                        color: filterTags.includes(tag)
                          ? "#FFFFFF"
                          : colors.accent,
                      }}
                    >
                      {tag}
                    </Chip>
                  ))}
                </View>
              </View>
            )}
          </Animatable.View>
        )}
      </View>

      {/* Sessions List */}
      <ScrollView
        style={styles.sessionsList}
        contentContainerStyle={styles.sessionsContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredSessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon
              name="chat-outline"
              size={64}
              color={isHighContrast ? "#666666" : "#9CA3AF"}
            />
            <Text
              style={[
                styles.emptyStateText,
                {
                  fontSize: textSizes.body,
                  color: isHighContrast ? "#666666" : "#6B7280",
                },
              ]}
            >
              {searchQuery ||
              selectedLanguage !== "all" ||
              filterTags.length > 0
                ? "No conversations match your filters"
                : "No conversations yet"}
            </Text>
            {(searchQuery ||
              selectedLanguage !== "all" ||
              filterTags.length > 0) && (
              <Button
                mode="outlined"
                onPress={() => {
                  setSearchQuery("");
                  setSelectedLanguage("all");
                  setFilterTags([]);
                  setShowFilters(false);
                }}
                style={{ marginTop: 16, borderColor: colors.primary }}
                labelStyle={{ color: colors.primary }}
              >
                Clear Filters
              </Button>
            )}
          </View>
        ) : (
          filteredSessions.map((session, index) =>
            renderSessionCard(session, index)
          )
        )}
      </ScrollView>

      {/* Session Detail Modal */}
      <Portal>
        <Modal
          visible={showSessionModal}
          onDismiss={() => setShowSessionModal(false)}
          contentContainerStyle={[
            styles.modalContainer,
            { backgroundColor: isHighContrast ? "#FFFFFF" : "#FFFFFF" },
          ]}
        >
          {selectedSession && (
            <View>
              <Text
                style={[
                  styles.modalTitle,
                  {
                    fontSize: textSizes.title,
                    color: colors.primary,
                  },
                ]}
              >
                Conversation Details
              </Text>

              <Text
                style={[
                  styles.modalDate,
                  {
                    fontSize: textSizes.body,
                    color: isHighContrast ? "#333333" : "#6B7280",
                  },
                ]}
              >
                {format(selectedSession.startTime, "PPPp", {
                  locale: getDateLocale(),
                })}
              </Text>

              {selectedSession.summary && (
                <Text
                  style={[
                    styles.modalSummary,
                    {
                      fontSize: textSizes.caption,
                      color: isHighContrast ? "#333333" : "#4B5563",
                    },
                  ]}
                >
                  {selectedSession.summary}
                </Text>
              )}

              <View style={styles.modalActions}>
                <Button
                  mode="contained"
                  onPress={() => {
                    setShowSessionModal(false);
                    handleExportSession(selectedSession);
                  }}
                  style={[
                    styles.modalButton,
                    { backgroundColor: colors.primary },
                  ]}
                  icon="download"
                >
                  Export
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setShowSessionModal(false);
                    handleShareWithFamily(selectedSession);
                  }}
                  style={[styles.modalButton, { borderColor: colors.accent }]}
                  textColor={colors.accent}
                  icon="share-variant"
                >
                  Share
                </Button>
                <Button
                  mode="text"
                  onPress={() => setShowSessionModal(false)}
                  textColor={colors.primary}
                >
                  Close
                </Button>
              </View>
            </View>
          )}
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    marginBottom: 12,
    elevation: 2,
  },
  filtersRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterButtonText: {
    fontWeight: "500",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  sortButtonText: {
    fontWeight: "500",
    textTransform: "capitalize",
  },
  filtersPanel: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    elevation: 3,
  },
  filterTitle: {
    fontWeight: "bold",
    marginBottom: 12,
  },
  filterSubtitle: {
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 12,
  },
  languageFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  languageChip: {
    marginRight: 4,
    marginBottom: 4,
  },
  tagFilters: {
    marginTop: 8,
  },
  tagChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tagChip: {
    marginRight: 4,
    marginBottom: 4,
  },
  sessionsList: {
    flex: 1,
  },
  sessionsContent: {
    padding: 16,
    paddingTop: 8,
  },
  sessionCard: {
    marginBottom: 16,
  },
  sessionSurface: {
    borderRadius: 12,
    overflow: "hidden",
  },
  sessionHeader: {
    padding: 16,
  },
  sessionHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sessionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  culturalIcon: {
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDate: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  sessionTime: {
    opacity: 0.7,
  },
  sessionSummary: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  tag: {
    marginRight: 4,
    marginBottom: 4,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  messagesPreview: {
    marginBottom: 12,
  },
  messagePreview: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 8,
  },
  messageText: {
    flex: 1,
    lineHeight: 18,
  },
  moreMessages: {
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
  },
  sessionActions: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-around",
  },
  actionButton: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyStateText: {
    marginTop: 16,
    textAlign: "center",
    fontWeight: "500",
  },
  modalContainer: {
    margin: 20,
    padding: 24,
    borderRadius: 16,
    maxHeight: "80%",
  },
  modalTitle: {
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  modalDate: {
    textAlign: "center",
    marginBottom: 16,
  },
  modalSummary: {
    lineHeight: 20,
    marginBottom: 24,
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-around",
    flexWrap: "wrap",
  },
  modalButton: {
    flex: 1,
    minWidth: 100,
  },
});

export default ConversationHistory;
