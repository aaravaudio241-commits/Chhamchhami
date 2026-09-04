import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ImageSourcePropType, ViewToken } from 'react-native';
import colors from '@/constants/colors';

type IconName = React.ComponentProps<typeof Feather>['name'];
type NavKey = 'home' | 'discover' | 'create' | 'inbox' | 'profile';

type FeedVideo = {
  id: string;
  creator: string;
  handle: string;
  caption: string;
  song: string;
  likes: number;
  comments: number;
  accent: string;
  image: ImageSourcePropType;
  videoUrl: string;
};

type Comment = {
  id: string;
  user: string;
  text: string;
};

const initialVideos: FeedVideo[] = [
  {
    id: 'canyon',
    creator: 'Maya N.',
    handle: '@mayawanders',
    caption: 'The kind of quiet that makes you stay a little longer.',
    song: 'A Moment Apart · ODESZA',
    likes: 18200,
    comments: 284,
    accent: '#FF6B57',
    image: require('@/assets/images/canyon.jpg'),
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  },
  {
    id: 'vase',
    creator: 'Studio Sunday',
    handle: '@studiosunday',
    caption: 'Found color in the smallest corner of the room.',
    song: 'Warm Foothills · alt-J',
    likes: 9700,
    comments: 126,
    accent: '#29D3C2',
    image: require('@/assets/images/vase.jpg'),
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  },
  {
    id: 'seoul',
    creator: 'Joon Park',
    handle: '@joon.afterdark',
    caption: 'Rain, neon, and nowhere else to be.',
    song: 'Midnight City · M83',
    likes: 24600,
    comments: 512,
    accent: '#8F7CFF',
    image: require('@/assets/images/seoul.jpg'),
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  },
];

const starterComments: Record<string, Comment[]> = {
  canyon: [
    { id: '1', user: 'lena', text: 'This feels like a deep breath.' },
    { id: '2', user: 'noahmakes', text: 'The color grading is unreal.' },
  ],
  vase: [{ id: '3', user: 'thea', text: 'That blue is everything.' }],
  seoul: [{ id: '4', user: 'riku', text: 'Adding this to my night walk playlist.' }],
};

const formatCount = (count: number) => {
  if (count >= 1000) {
    const value = count / 1000;
    return `${value >= 10 ? Math.round(value) : value.toFixed(1)}K`;
  }
  return `${count}`;
};

function IconButton({
  icon,
  label,
  active,
  color = colors.light.foreground,
  onPress,
}: {
  icon: IconName;
  label: string;
  active?: boolean;
  color?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      testID={`action-${label.toLowerCase().replaceAll(' ', '-')}`}
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
    >
      <View style={[styles.actionIcon, active && { backgroundColor: color }]}>
        <Feather
          name={icon}
          size={22}
          color={active ? colors.light.background : color}
          fill={active ? color : 'transparent'}
        />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function BottomNav({
  active,
  onChange,
  bottomInset,
}: {
  active: NavKey;
  onChange: (key: NavKey) => void;
  bottomInset: number;
}) {
  const items: { key: NavKey; icon: IconName; label: string }[] = [
    { key: 'home', icon: 'home', label: 'Home' },
    { key: 'discover', icon: 'search', label: 'Discover' },
    { key: 'create', icon: 'plus', label: 'Create' },
    { key: 'inbox', icon: 'message-circle', label: 'Inbox' },
    { key: 'profile', icon: 'user', label: 'Profile' },
  ];

  return (
    <View style={[styles.bottomNav, { paddingBottom: bottomInset }]}>
      {items.map((item) => (
        <Pressable
          key={item.key}
          testID={`nav-${item.key}`}
          accessibilityLabel={item.label}
          onPress={() => {
            Haptics.selectionAsync();
            onChange(item.key);
          }}
          style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}
        >
          {item.key === 'create' ? (
            <View style={styles.createButton}>
              <Feather name="plus" size={25} color={colors.light.background} />
            </View>
          ) : (
            <Feather
              name={item.icon}
              size={22}
              color={active === item.key ? colors.light.foreground : colors.light.mutedForeground}
              fill={active === item.key ? colors.light.foreground : 'transparent'}
            />
          )}
          <Text style={[styles.navLabel, active === item.key && styles.navLabelActive]}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function VideoCard({
  video,
  isPlaying,
  isLiked,
  isSaved,
  isFollowing,
  onLike,
  onSave,
  onFollow,
  onComments,
  onShare,
  onTogglePlayback,
}: {
  video: FeedVideo;
  isPlaying: boolean;
  isLiked: boolean;
  isSaved: boolean;
  isFollowing: boolean;
  onLike: () => void;
  onSave: () => void;
  onFollow: () => void;
  onComments: () => void;
  onShare: () => void;
  onTogglePlayback: () => void;
}) {
  const player = useVideoPlayer(video.videoUrl, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.timeUpdateEventInterval = 0.25;
  });
  const [playing, setPlaying] = useState(isPlaying);
  const [progress, setProgress] = useState(0.35);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const playingSubscription = player.addListener('playingChange', ({ isPlaying: nextIsPlaying }) => {
      setPlaying(nextIsPlaying);
    });
    const timeUpdateSubscription = player.addListener('timeUpdate', ({ currentTime }) => {
      if (player.duration > 0) {
        setProgress(currentTime / player.duration);
      }
    });
    const statusSubscription = player.addListener('statusChange', ({ status }) => {
      if (status === 'error') setVideoFailed(true);
    });

    return () => {
      playingSubscription.remove();
      timeUpdateSubscription.remove();
      statusSubscription.remove();
    };
  }, [player]);

  useEffect(() => {
    if (isPlaying && !videoFailed) {
      player.play();
    } else {
      player.pause();
      setPlaying(false);
      setProgress(0.35);
    }

    return () => {
      player.pause();
    };
  }, [isPlaying, player, videoFailed]);

  const toggle = () => {
    if (playing) {
      player.pause();
    } else {
      player.play();
    }
    setPlaying((current) => !current);
    onTogglePlayback();
  };

  return (
    <Pressable onPress={toggle} style={styles.videoCard}>
      {isPlaying && !videoFailed ? (
        <>
          <Image source={video.image} style={StyleSheet.absoluteFill} contentFit="cover" />
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            nativeControls={false}
            contentFit="cover"
            crossOrigin="anonymous"
          />
        </>
      ) : (
        <Image source={video.image} style={StyleSheet.absoluteFill} contentFit="cover" />
      )}
      <LinearGradient
        colors={['rgba(6, 10, 24, 0.6)', 'transparent', 'rgba(6, 10, 24, 0.85)']}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.videoNoise} />
      {!playing && isPlaying ? (
        <View style={styles.pausedBadge}>
          <Feather name="play" size={24} color={colors.light.foreground} fill={colors.light.foreground} />
        </View>
      ) : null}

      <View style={styles.videoContent}>
        <View style={styles.videoMeta}>
          <View style={styles.creatorRow}>
            <View style={[styles.avatar, { backgroundColor: video.accent }]}>
              <Text style={styles.avatarText}>{video.creator.charAt(0)}</Text>
            </View>
            <View>
              <View style={styles.nameRow}>
                <Text style={styles.creatorName}>{video.creator}</Text>
                <Feather name="check-circle" size={13} color={colors.light.accent} />
              </View>
              <Text style={styles.handle}>{video.handle}</Text>
            </View>
            <Pressable
              accessibilityLabel={isFollowing ? 'Unfollow creator' : 'Follow creator'}
              onPress={(event) => {
                event.stopPropagation();
                onFollow();
              }}
              style={[styles.followButton, isFollowing && styles.followingButton]}
            >
              <Text style={[styles.followText, isFollowing && styles.followingText]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.caption}>{video.caption}</Text>
          <View style={styles.songRow}>
            <Feather name="music" size={13} color={colors.light.foreground} />
            <Text style={styles.songText}>{video.song}</Text>
          </View>
        </View>

        <View style={styles.actionRail}>
          <IconButton
            icon="heart"
            label={formatCount(video.likes + (isLiked ? 1 : 0))}
            active={isLiked}
            color={isLiked ? colors.light.destructive : colors.light.foreground}
            onPress={onLike}
          />
          <IconButton
            icon="message-circle"
            label={formatCount(video.comments)}
            onPress={onComments}
          />
          <IconButton
            icon="bookmark"
            label={isSaved ? 'Saved' : 'Save'}
            active={isSaved}
            color={colors.light.accent}
            onPress={onSave}
          />
          <IconButton icon="send" label="Share" onPress={onShare} />
          <View style={styles.recordDisc}>
            <View style={styles.recordDiscInner} />
          </View>
        </View>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(3, progress * 100)}%`, backgroundColor: video.accent }]} />
      </View>
    </Pressable>
  );
}

function DiscoverView({ topInset }: { topInset: number }) {
  const [query, setQuery] = useState('');
  const trends = ['cinematic walks', 'tiny spaces', 'street food', 'slow mornings'];
  return (
    <View style={styles.secondaryView}>
      <View style={[styles.secondaryHeader, { paddingTop: topInset + 10 }]}>
        <Text style={styles.secondaryTitle}>Discover</Text>
        <Text style={styles.secondarySubtitle}>Find your next favorite loop.</Text>
      </View>
      <View style={styles.searchField}>
        <Feather name="search" size={19} color={colors.light.mutedForeground} />
        <TextInput
          testID="discover-search"
          value={query}
          onChangeText={setQuery}
          placeholder="Search creators, sounds, or moods"
          placeholderTextColor={colors.light.mutedForeground}
          style={styles.searchInput}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} accessibilityLabel="Clear search">
            <Feather name="x" size={18} color={colors.light.mutedForeground} />
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.sectionLabel}>{query ? `Results for “${query}”` : 'Trending now'}</Text>
      <View style={styles.trendGrid}>
        {trends.map((trend, index) => (
          <Pressable key={trend} onPress={() => setQuery(trend)} style={styles.trendCard}>
            <Image
              source={initialVideos[index % initialVideos.length].image}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
            <LinearGradient colors={['transparent', 'rgba(8, 12, 28, .88)']} style={StyleSheet.absoluteFill} />
            <Text style={styles.trendText}>{trend}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function SimpleView({
  type,
  topInset,
}: {
  type: 'inbox' | 'profile';
  topInset: number;
}) {
  const isProfile = type === 'profile';
  return (
    <View style={styles.secondaryView}>
      <View style={[styles.secondaryHeader, { paddingTop: topInset + 10 }]}>
        <Text style={styles.secondaryTitle}>{isProfile ? 'Profile' : 'Inbox'}</Text>
        <Text style={styles.secondarySubtitle}>
          {isProfile ? 'Your corner of the loop.' : 'The good stuff, delivered.'}
        </Text>
      </View>
      {isProfile ? (
        <View style={styles.profileHero}>
          <View style={[styles.profileAvatar, { backgroundColor: colors.light.primary }]}>
            <Text style={styles.profileAvatarText}>A</Text>
          </View>
          <Text style={styles.profileName}>Aarav</Text>
          <Text style={styles.profileHandle}>@aarav.creates</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}><Text style={styles.statValue}>12</Text><Text style={styles.statLabel}>Following</Text></View>
            <View style={styles.stat}><Text style={styles.statValue}>248</Text><Text style={styles.statLabel}>Followers</Text></View>
            <View style={styles.stat}><Text style={styles.statValue}>9.4K</Text><Text style={styles.statLabel}>Likes</Text></View>
          </View>
          <Pressable style={styles.editProfileButton} onPress={() => Alert.alert('Profile', 'Profile editing will be available when you connect an account.')}>
            <Text style={styles.editProfileText}>Edit profile</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.inboxList}>
          {[
            ['Maya N.', 'liked your video', '2m', 'heart'],
            ['Studio Sunday', 'started following you', '1h', 'user-plus'],
            ['Joon Park', 'shared a sound with you', '3h', 'music'],
          ].map(([user, action, time, icon]) => (
            <View key={user} style={styles.inboxRow}>
              <View style={styles.smallAvatar}><Text style={styles.avatarText}>{user.charAt(0)}</Text></View>
              <Text style={styles.inboxCopy}><Text style={styles.inboxUser}>{user}</Text> {action}</Text>
              <Text style={styles.inboxTime}>{time}</Text>
              <Feather name={icon as IconName} size={17} color={colors.light.mutedForeground} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<FeedVideo>>(null);
  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 0);
  const [activeNav, setActiveNav] = useState<NavKey>('home');
  const [activeIndex, setActiveIndex] = useState(0);
  const [feedMode, setFeedMode] = useState<'For You' | 'Following'>('For You');
  const [videos, setVideos] = useState<FeedVideo[]>(initialVideos);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, Comment[]>>(starterComments);
  const [commentsVideo, setCommentsVideo] = useState<FeedVideo | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
    minimumViewTime: 100,
  }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const nextVisibleItem = viewableItems
      .filter((item) => item.isViewable && item.index !== null)
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))[0];

    if (nextVisibleItem?.index !== null && nextVisibleItem?.index !== undefined) {
      setActiveIndex(nextVisibleItem.index);
    }
  }).current;

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('short-video-liked'),
      AsyncStorage.getItem('short-video-saved'),
      AsyncStorage.getItem('short-video-following'),
    ]).then(([likedValue, savedValue, followingValue]) => {
      if (likedValue) setLiked(new Set(JSON.parse(likedValue)));
      if (savedValue) setSaved(new Set(JSON.parse(savedValue)));
      if (followingValue) setFollowing(new Set(JSON.parse(followingValue)));
    });
  }, []);

  const persistSet = async (key: string, value: Set<string>) => {
    await AsyncStorage.setItem(key, JSON.stringify(Array.from(value)));
  };

  const toggleSet = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    key: string,
    storageKey: string,
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setter((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      void persistSet(storageKey, next);
      return next;
    });
  };

  const activeVideo = videos[activeIndex] ?? videos[0];
  const followingVideos = useMemo(() => videos.filter((video) => following.has(video.id)), [following, videos]);
  const visibleVideos = feedMode === 'Following' && followingVideos.length > 0 ? followingVideos : videos;

  useEffect(() => {
    if (activeIndex >= visibleVideos.length) setActiveIndex(0);
  }, [activeIndex, visibleVideos.length]);

  const onShare = async (video: FeedVideo) => {
    await Share.share({ message: `${video.creator} on Loop: ${video.caption}` });
  };

  const openCreate = () => {
    setCreateOpen(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      const newVideo: FeedVideo = {
        id: `clip-${Date.now()}`,
        creator: 'Aarav',
        handle: '@aarav.creates',
        caption: 'A new moment, ready to loop.',
        song: 'Original sound · Aarav',
        likes: 0,
        comments: 0,
        accent: colors.light.primary,
        image: { uri: result.assets[0].uri },
        videoUrl: result.assets[0].uri,
      };
      setVideos((current) => [newVideo, ...current]);
      setActiveIndex(0);
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
      });
      setActiveNav('home');
      setCreateOpen(false);
      Alert.alert('Clip added', 'Your clip is now at the top of your local feed.');
    }
  };

  const renderFeed = () => (
    <View style={styles.feedShell}>
      <FlatList
        ref={listRef}
        data={visibleVideos}
        keyExtractor={(item) => item.id}
        pagingEnabled
        snapToInterval={height}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        scrollEnabled={visibleVideos.length > 0}
         viewabilityConfig={viewabilityConfig}
         onViewableItemsChanged={onViewableItemsChanged}
        renderItem={({ item, index }) => (
          <VideoCard
            video={item}
             isPlaying={index === activeIndex}
            isLiked={liked.has(item.id)}
            isSaved={saved.has(item.id)}
            isFollowing={following.has(item.id)}
            onLike={() => toggleSet(setLiked, item.id, 'short-video-liked')}
            onSave={() => toggleSet(setSaved, item.id, 'short-video-saved')}
            onFollow={() => toggleSet(setFollowing, item.id, 'short-video-following')}
            onComments={() => setCommentsVideo(item)}
            onShare={() => onShare(item)}
            onTogglePlayback={() => Haptics.selectionAsync()}
          />
        )}
        onMomentumScrollEnd={(event) => {
          const nextIndex = Math.round(event.nativeEvent.contentOffset.y / height);
          setActiveIndex(nextIndex);
        }}
        getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
        ListEmptyComponent={
          <View style={[styles.emptyFeed, { height }]}>
            <Feather name="users" size={34} color={colors.light.mutedForeground} />
            <Text style={styles.emptyTitle}>Your circle is still small</Text>
            <Text style={styles.emptyCopy}>Follow a creator to make this feed yours.</Text>
            <Pressable onPress={() => setFeedMode('For You')} style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>Explore For You</Text>
            </Pressable>
          </View>
        }
      />
      <View style={[styles.topBar, { top: topInset }]}>
        <Text style={styles.wordmark}>loop</Text>
        <View style={styles.feedTabs}>
          {(['For You', 'Following'] as const).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => {
                setFeedMode(mode);
                setActiveIndex(0);
                listRef.current?.scrollToOffset({ offset: 0, animated: false });
              }}
              style={styles.feedTab}
            >
              <Text style={[styles.feedTabText, feedMode === mode && styles.feedTabTextActive]}>{mode}</Text>
              {feedMode === mode ? <View style={styles.feedTabUnderline} /> : null}
            </Pressable>
          ))}
        </View>
        <Pressable
          accessibilityLabel={isMuted ? 'Turn sound on' : 'Mute sound'}
          onPress={() => setIsMuted((current) => !current)}
          style={styles.soundButton}
        >
          <Feather name={isMuted ? 'volume-x' : 'volume-2'} size={19} color={colors.light.foreground} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { width, backgroundColor: colors.light.background }]}>
      {activeNav === 'home' ? renderFeed() : null}
      {activeNav === 'discover' ? <DiscoverView topInset={topInset} /> : null}
      {activeNav === 'inbox' ? <SimpleView type="inbox" topInset={topInset} /> : null}
      {activeNav === 'profile' ? <SimpleView type="profile" topInset={topInset} /> : null}
      <BottomNav
        active={activeNav}
        onChange={(key) => (key === 'create' ? openCreate() : setActiveNav(key))}
        bottomInset={bottomInset}
      />

      <Modal
        visible={commentsVideo !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setCommentsVideo(null)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <View style={[styles.commentsSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Comments</Text>
                <Text style={styles.sheetSubtitle}>{commentsVideo ? formatCount(commentsVideo.comments) : ''} thoughts</Text>
              </View>
              <Pressable onPress={() => setCommentsVideo(null)} accessibilityLabel="Close comments">
                <Feather name="x" size={23} color={colors.light.foreground} />
              </Pressable>
            </View>
            <FlatList
              data={commentsVideo ? comments[commentsVideo.id] ?? [] : []}
              keyExtractor={(item) => item.id}
              style={styles.commentList}
              contentContainerStyle={styles.commentListContent}
              ListEmptyComponent={<Text style={styles.emptyComments}>Be the first to say something.</Text>}
              renderItem={({ item }) => (
                <View style={styles.commentRow}>
                  <View style={styles.commentAvatar}><Text style={styles.commentAvatarText}>{item.user.charAt(0).toUpperCase()}</Text></View>
                  <View style={styles.commentBody}>
                    <Text style={styles.commentUser}>@{item.user}</Text>
                    <Text style={styles.commentCopy}>{item.text}</Text>
                  </View>
                </View>
              )}
            />
            <View style={styles.commentComposer}>
              <TextInput
                testID="comment-input"
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Add a thoughtful comment..."
                placeholderTextColor={colors.light.mutedForeground}
                style={styles.commentInput}
                returnKeyType="send"
                onSubmitEditing={() => {
                  if (!commentsVideo || !commentText.trim()) return;
                  setComments((current) => ({
                    ...current,
                    [commentsVideo.id]: [
                      ...(current[commentsVideo.id] ?? []),
                      { id: `${Date.now()}`, user: 'aarav', text: commentText.trim() },
                    ],
                  }));
                  setCommentText('');
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
              />
              <Pressable
                accessibilityLabel="Post comment"
                disabled={!commentText.trim()}
                onPress={() => {
                  if (!commentsVideo || !commentText.trim()) return;
                  setComments((current) => ({
                    ...current,
                    [commentsVideo.id]: [
                      ...(current[commentsVideo.id] ?? []),
                      { id: `${Date.now()}`, user: 'aarav', text: commentText.trim() },
                    ],
                  }));
                  setCommentText('');
                }}
                style={[styles.sendCommentButton, !commentText.trim() && styles.disabledButton]}
              >
                <Feather name="arrow-up" size={19} color={colors.light.background} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.createSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.createIcon}><Feather name="video" size={28} color={colors.light.background} /></View>
            <Text style={styles.sheetTitle}>Make a loop</Text>
            <Text style={styles.createCopy}>Bring a small moment to life. Pick a video from your library and add it to your local feed.</Text>
            <Pressable testID="pick-video" onPress={pickVideo} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Feather name="upload" size={18} color={colors.light.background} />
              <Text style={styles.primaryButtonText}>Choose from library</Text>
            </Pressable>
            <Pressable onPress={() => setCreateOpen(false)} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Not now</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const { height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1 },
  feedShell: { flex: 1, backgroundColor: colors.light.background },
  videoCard: { height: screenHeight, width: '100%', backgroundColor: colors.light.background, overflow: 'hidden' },
  videoNoise: { ...StyleSheet.absoluteFill, opacity: 0.08, backgroundColor: '#FFFFFF' },
  videoContent: { flex: 1, paddingHorizontal: 18, paddingBottom: 102, justifyContent: 'flex-end' },
  topBar: { position: 'absolute', left: 18, right: 18, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordmark: { color: colors.light.foreground, fontSize: 28, fontWeight: '700', letterSpacing: -1.6 },
  feedTabs: { flexDirection: 'row', gap: 22, marginLeft: 20 },
  feedTab: { height: 38, justifyContent: 'center', alignItems: 'center' },
  feedTabText: { color: 'rgba(248,245,240,.64)', fontSize: 14, fontWeight: '600' },
  feedTabTextActive: { color: colors.light.foreground },
  feedTabUnderline: { height: 2, borderRadius: 1, backgroundColor: colors.light.foreground, width: 20, marginTop: 5 },
  soundButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(8,12,28,.35)', alignItems: 'center', justifyContent: 'center' },
  videoMeta: { width: '78%', gap: 10 },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(248,245,240,.75)' },
  avatarText: { color: colors.light.background, fontSize: 15, fontWeight: '800' },
  nameRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  creatorName: { color: colors.light.foreground, fontSize: 15, fontWeight: '700' },
  handle: { color: 'rgba(248,245,240,.66)', fontSize: 12, marginTop: 2 },
  followButton: { marginLeft: 4, borderColor: colors.light.foreground, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 9 },
  followingButton: { backgroundColor: 'rgba(248,245,240,.15)', borderColor: 'transparent' },
  followText: { color: colors.light.foreground, fontSize: 11, fontWeight: '700' },
  followingText: { color: colors.light.foreground },
  caption: { color: colors.light.foreground, fontSize: 16, lineHeight: 22, fontWeight: '500' },
  songRow: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  songText: { color: 'rgba(248,245,240,.82)', fontSize: 12, fontWeight: '500' },
  actionRail: { position: 'absolute', right: 15, bottom: 123, alignItems: 'center', gap: 13 },
  actionButton: { alignItems: 'center', gap: 4, minWidth: 44 },
  actionIcon: { width: 39, height: 39, borderRadius: 20, backgroundColor: 'rgba(8,12,28,.36)', alignItems: 'center', justifyContent: 'center' },
  actionLabel: { color: colors.light.foreground, fontSize: 11, fontWeight: '700', textShadowColor: 'rgba(0,0,0,.55)', textShadowRadius: 5 },
  recordDisc: { marginTop: 2, width: 35, height: 35, borderRadius: 18, backgroundColor: '#11182A', borderWidth: 5, borderColor: '#6A7894', alignItems: 'center', justifyContent: 'center' },
  recordDiscInner: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.light.foreground },
  progressTrack: { position: 'absolute', left: 0, right: 0, bottom: 83, height: 2, backgroundColor: 'rgba(248,245,240,.24)' },
  progressFill: { height: 2, borderRadius: 2 },
  pausedBadge: { position: 'absolute', top: '45%', left: '45%', width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(8,12,28,.48)', alignItems: 'center', justifyContent: 'center' },
  bottomNav: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 84, paddingTop: 10, backgroundColor: 'rgba(8,12,28,.88)', flexDirection: 'row', justifyContent: 'space-around' },
  navItem: { flex: 1, alignItems: 'center', gap: 5 },
  navLabel: { color: colors.light.mutedForeground, fontSize: 10, fontWeight: '600' },
  navLabelActive: { color: colors.light.foreground },
  createButton: { width: 40, height: 30, borderRadius: 10, backgroundColor: colors.light.primary, alignItems: 'center', justifyContent: 'center', marginTop: -2 },
  pressed: { opacity: 0.72 },
  secondaryView: { flex: 1, backgroundColor: colors.light.background, paddingHorizontal: 18 },
  secondaryHeader: { gap: 5, paddingBottom: 22 },
  secondaryTitle: { color: colors.light.foreground, fontSize: 30, fontWeight: '700', letterSpacing: -0.8 },
  secondarySubtitle: { color: colors.light.mutedForeground, fontSize: 14 },
  searchField: { height: 50, borderRadius: 15, backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.border, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInput: { flex: 1, color: colors.light.foreground, fontSize: 14 },
  sectionLabel: { color: colors.light.foreground, fontSize: 13, fontWeight: '700', marginTop: 26, marginBottom: 12 },
  trendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  trendCard: { width: '47%', height: 158, borderRadius: 17, overflow: 'hidden', justifyContent: 'flex-end', padding: 13 },
  trendText: { color: colors.light.foreground, fontSize: 14, fontWeight: '700' },
  profileHero: { alignItems: 'center', paddingTop: 18 },
  profileAvatar: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  profileAvatarText: { color: colors.light.background, fontSize: 34, fontWeight: '800' },
  profileName: { color: colors.light.foreground, fontSize: 22, fontWeight: '700' },
  profileHandle: { color: colors.light.mutedForeground, fontSize: 14, marginTop: 4 },
  statsRow: { flexDirection: 'row', marginTop: 28, gap: 35 },
  stat: { alignItems: 'center', gap: 4 },
  statValue: { color: colors.light.foreground, fontSize: 18, fontWeight: '700' },
  statLabel: { color: colors.light.mutedForeground, fontSize: 11 },
  editProfileButton: { marginTop: 26, borderWidth: 1, borderColor: colors.light.border, borderRadius: 11, paddingVertical: 11, paddingHorizontal: 38 },
  editProfileText: { color: colors.light.foreground, fontSize: 13, fontWeight: '700' },
  inboxList: { gap: 4, paddingTop: 8 },
  inboxRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderBottomColor: colors.light.border },
  smallAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.light.secondary, alignItems: 'center', justifyContent: 'center' },
  inboxCopy: { flex: 1, color: colors.light.mutedForeground, fontSize: 13, lineHeight: 19 },
  inboxUser: { color: colors.light.foreground, fontWeight: '700' },
  inboxTime: { color: colors.light.mutedForeground, fontSize: 11 },
  emptyFeed: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 35, backgroundColor: colors.light.background },
  emptyTitle: { color: colors.light.foreground, fontSize: 20, fontWeight: '700', marginTop: 14 },
  emptyCopy: { color: colors.light.mutedForeground, fontSize: 14, textAlign: 'center', marginTop: 8 },
  emptyButton: { backgroundColor: colors.light.primary, borderRadius: 11, paddingVertical: 12, paddingHorizontal: 18, marginTop: 20 },
  emptyButtonText: { color: colors.light.background, fontSize: 13, fontWeight: '700' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(3,5,13,.62)' },
  commentsSheet: { maxHeight: '80%', minHeight: '48%', backgroundColor: colors.light.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 10, paddingHorizontal: 18 },
  sheetHandle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 3, backgroundColor: colors.light.border, marginBottom: 18 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.light.border },
  sheetTitle: { color: colors.light.foreground, fontSize: 20, fontWeight: '700' },
  sheetSubtitle: { color: colors.light.mutedForeground, fontSize: 12, marginTop: 3 },
  commentList: { flex: 1 },
  commentListContent: { paddingVertical: 15, gap: 16 },
  emptyComments: { color: colors.light.mutedForeground, textAlign: 'center', paddingTop: 35 },
  commentRow: { flexDirection: 'row', gap: 10 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.light.secondary, alignItems: 'center', justifyContent: 'center' },
  commentAvatarText: { color: colors.light.foreground, fontSize: 12, fontWeight: '700' },
  commentBody: { flex: 1, gap: 3 },
  commentUser: { color: colors.light.foreground, fontSize: 12, fontWeight: '700' },
  commentCopy: { color: colors.light.mutedForeground, fontSize: 13, lineHeight: 18 },
  commentComposer: { flexDirection: 'row', alignItems: 'center', gap: 9, borderTopWidth: 1, borderTopColor: colors.light.border, paddingTop: 12 },
  commentInput: { flex: 1, height: 42, borderRadius: 14, backgroundColor: colors.light.secondary, color: colors.light.foreground, paddingHorizontal: 13, fontSize: 13 },
  sendCommentButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.light.primary },
  disabledButton: { opacity: 0.38 },
  createSheet: { backgroundColor: colors.light.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 10, paddingHorizontal: 24, alignItems: 'center' },
  createIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: colors.light.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  createCopy: { color: colors.light.mutedForeground, fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 310, marginTop: 9 },
  primaryButton: { width: '100%', height: 50, borderRadius: 14, backgroundColor: colors.light.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, marginTop: 24 },
  primaryButtonText: { color: colors.light.background, fontSize: 14, fontWeight: '700' },
  cancelButton: { padding: 16 },
  cancelButtonText: { color: colors.light.mutedForeground, fontSize: 14, fontWeight: '600' },
});