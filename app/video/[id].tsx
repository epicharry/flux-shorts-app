// VideoScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Play, Maximize, Minimize } from 'lucide-react-native';
import CustomFooter from '@/components/CustomFooter';
import { movieService } from '@/services/movieService';
import { Movie } from '@/types/movie';

import { checkIsPaidUser } from '@/config/subscription';
import { useEventListener } from 'expo'; // <-- event hook for player events

export default function VideoScreen() {
  const { id, title, videoUrl, thumbnailUrl, genre, year } = useLocalSearchParams();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [recentMovies, setRecentMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  // paywall state + guard so it fires only once
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallTriggered, setPaywallTriggered] = useState(false);
  const [seconds, setSeconds] = useState<number | null>(null);

  // create player and configure it
  const player = useVideoPlayer(videoUrl as string, (player) => {
    player.loop = true;
    player.muted = false;
    player.timeUpdateEventInterval = 1;

    player.addListener("statusChange", (status: any) => {
      if (status?.error) {
        console.log("Video error:", status.error);
        setVideoError(true);
        setIsPlaying(false);
      }
    });
  });

  // ⏳ enforce paywall at 45s
  useEventListener(player, "timeUpdate", (evt: any) => {
    const seconds =
      typeof evt?.currentTime === "number"
        ? evt.currentTime
        : typeof evt?.positionMillis === "number"
        ? evt.positionMillis / 1000
        : typeof evt?.position === "number"
        ? evt.position
        : null;

        setSeconds(seconds);
  });

  useEffect(() => {
      if (seconds !== null && seconds >= 45 && !paywallTriggered) {
        const checkPaywall = async () => {
          const isPaid = await checkIsPaidUser();
          console.log("⏳ seconds:", seconds, "isPaid?", isPaid);

          if (!isPaid) {
            setPaywallTriggered(true);
            try {
              player.pause();
            } catch (e) {
              console.log("Error pausing player for paywall:", e);
            }
            setShowPaywall(true);
          }
        };

        checkPaywall();
      }
    }, [seconds, paywallTriggered]);

  useEffect(() => {
    loadRecentMovies();
  }, []);

  const loadRecentMovies = async () => {
    try {
      const movies = await movieService.getMoviesByGenre(genre as string, id as string);
      setRecentMovies(movies);
    } catch (error) {
      console.error("Error loading recent movies:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFullscreenPress = async () => {
    try {
      setIsFullscreen(true);
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    } catch (error) {
      console.log("Fullscreen error:", error);
    }
  };

  const handleExitFullscreen = async () => {
    try {
      setIsFullscreen(false);
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    } catch (error) {
      console.log("Exit fullscreen error:", error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        if (player) {
          try {
            player.pause();
          } catch {}
        }
        setIsPlaying(false);
        setIsFullscreen(false);
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      };
    }, [player])
  );

  useEffect(() => {
    return () => {
      if (player) {
        try {
          player.pause();
        } catch {}
      }
      setIsPlaying(false);
      setIsFullscreen(false);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, [player]);

  const handleBackPress = async () => {
    if (player) {
      try {
        player.pause();
      } catch {}
    }
    setIsPlaying(false);
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    router.back();
  };

  const navigateToVideo = (movie: Movie) => {
    if (player) {
      try {
        player.pause();
      } catch {}
    }
    setIsPlaying(false);

    router.push({
      pathname: "/video/[id]",
      params: {
        id: movie.id,
        title: movie.title,
        videoUrl: movie.videoUrl,
        thumbnailUrl: movie.thumbnailUrl,
        genre: movie.metadata.genre,
        year: movie.metadata.year.toString(),
      },
    });
  };

  const handlePlayPress = async () => {
    try {
      setVideoError(false);
      setIsPlaying(true);
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      setIsFullscreen(true);
      player.play();
    } catch (error) {
      console.log("Play error:", error);
      setVideoError(true);
      setIsPlaying(false);
    }
  };

  const handleRetryVideo = () => {
    try {
      setVideoError(false);
      setIsPlaying(false);
      player.replay();
    } catch (error) {
      console.log("Retry error:", error);
      setVideoError(true);
    }
  };

  // 🔹 Fullscreen-only render
  if (isFullscreen) {
    return (
      <View style={styles.fullscreenVideo}>
        <StatusBar hidden />
        <VideoView
          style={StyleSheet.absoluteFillObject}
          player={player}
          allowsPictureInPicture
          contentFit="cover"
          nativeControls={!showPaywall} // disable controls when paywall active
        />

        {!showPaywall && (
          <TouchableOpacity
            style={styles.exitFullscreenButton}
            onPress={handleExitFullscreen}
          >
            <Minimize size={24} color="#fff" />
          </TouchableOpacity>
        )}

        {/* ✅ Paywall overlays fullscreen */}
        {showPaywall && (
          <Modal visible transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Subscribe to Continue</Text>
                <Text style={styles.modalText}>
                  You’ve watched 45 seconds. Unlock full access by subscribing.
                </Text>

                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: "#1d4ed8", marginBottom: 12 }]}
                  onPress={() => {
                    setShowPaywall(false);
                    router.push("/subscribe");
                  }}
                >
                  <Text style={styles.modalButtonText}>Subscribe Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
      </View>
    );
  }

  // Normal page render
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#7c2d12" />
      <LinearGradient colors={['#7c2d12', '#1a1a1a']} style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 0 }]}
          >
            <View style={styles.header}>
              <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
                <ArrowLeft size={24} color="#ffffff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{title || 'Video'}</Text>
            </View>

            <View style={styles.videoPlayer}>
              {videoError ? (
                <View style={styles.errorContainer}>
                  <Image source={{ uri: thumbnailUrl as string }} style={styles.thumbnail} />
                  <View style={styles.errorOverlay}>
                    <Text style={styles.errorText}>Video playback error</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={handleRetryVideo}>
                      <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : !isPlaying ? (
                <TouchableOpacity style={styles.thumbnailContainer} onPress={handlePlayPress}>
                  <Image source={{ uri: thumbnailUrl as string }} style={styles.thumbnail} />
                  <View style={styles.playButtonContainer}>
                    <View style={styles.playButton}>
                      <Play size={32} color="#ffffff" fill="#ffffff" />
                    </View>
                  </View>
                  <TouchableOpacity style={styles.fullscreenButton} onPress={handleFullscreenPress}>
                    <Maximize size={20} color="#ffffff" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ) : (
                <View style={styles.videoContainer}>
                  <VideoView
                    style={styles.video}
                    player={player}
                    allowsPictureInPicture
                    contentFit="cover"
                    showsTimecodes
                    nativeControls
                  />
                </View>
              )}
            </View>

            <View style={styles.movieInfo}>
              <Text style={styles.movieTitle}>{title}</Text>
              <Text style={styles.movieMeta}>{genre} • {year}</Text>
            </View>

            {loading ? (
              <View style={styles.loadingSection}>
                <ActivityIndicator size="small" color="#fbbf24" />
                <Text style={styles.loadingText}>Loading more videos...</Text>
              </View>
            ) : (
              recentMovies.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>More Videos</Text>
                  <View style={styles.videoGrid}>
                    {recentMovies.slice(0, 6).map((movie) => (
                      <TouchableOpacity
                        key={movie.id}
                        style={styles.gridItem}
                        onPress={() => navigateToVideo(movie)}
                      >
                        <Image source={{ uri: movie.thumbnailUrl }} style={styles.gridImage} />
                        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.gridOverlay}>
                          <Text style={styles.gridTitle}>{movie.title}</Text>
                          <Text style={styles.gridMeta}>
                            {movie.metadata.genre} • {movie.metadata.year}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )
            )}
          </ScrollView>
          <CustomFooter />
        </SafeAreaView>
      </LinearGradient>

      {/* ✅ Paywall for portrait view too */}
      {showPaywall && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Subscribe to Continue</Text>
              <Text style={styles.modalText}>
                You’ve watched 45 seconds. Unlock full access by subscribing.
              </Text>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#1d4ed8", marginBottom: 12 }]}
                onPress={() => {
                  setShowPaywall(false);
                  router.push("/subscribe");
                }}
              >
                <Text style={styles.modalButtonText}>Subscribe Now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#6b7280" }]}
                onPress={() => setShowPaywall(false)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 16 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fbbf24', flex: 1 },
  videoPlayer: { height: Dimensions.get('window').height * 0.6, marginHorizontal: 16, marginBottom: 24, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000' },
  thumbnailContainer: { flex: 1, position: 'relative' },
  thumbnail: { width: '100%', height: '100%', resizeMode: 'cover' },
  playButtonContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  playButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', paddingLeft: 4 },
  fullscreenButton: { position: 'absolute', bottom: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  videoContainer: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1 },
  fullscreenVideo: { flex: 1, backgroundColor: '#000' },
  exitFullscreenButton: { position: 'absolute', top: 40, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 20 },
  movieInfo: { paddingHorizontal: 16, marginBottom: 24 },
  movieTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  movieMeta: { fontSize: 16, color: '#d1d5db' },
  loadingSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, gap: 12 },
  loadingText: { color: '#fff', fontSize: 14 },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  videoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { width: '48%', height: 140, borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  gridImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  gridOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 12, paddingVertical: 8 },
  gridTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  gridMeta: { color: '#d1d5db', fontSize: 12 },
  errorContainer: { flex: 1, position: 'relative' },
  errorOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', gap: 12 },
  errorText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  retryButton: { backgroundColor: '#ff6b35', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 320 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  modalText: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  modalButton: { borderRadius: 8, paddingVertical: 12 },
  modalButtonText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
});
