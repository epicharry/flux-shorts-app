import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import CustomFooter from '@/components/CustomFooter';
import { movieService } from '@/services/movieService';
import { Movie } from '@/types/movie';

export default function HomeScreen() {
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]);
  const [recentMovies, setRecentMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMovies();
  }, []);

  const loadMovies = async () => {
    try {
      setLoading(true);
      const [featured, recent] = await Promise.all([
        movieService.getFeaturedMovies(),
        movieService.getRecentMovies()
      ]);
      setFeaturedMovies(featured);
      setRecentMovies(recent);
    } catch (error) {
      console.error('Error loading movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToVideo = (movie: Movie) => {
    router.push({
      pathname: '/video/[id]',
      params: { 
        id: movie.id, 
        title: movie.title,
        videoUrl: movie.videoUrl,
        thumbnailUrl: movie.thumbnailUrl,
        genre: movie.metadata.genre,
        year: movie.metadata.year.toString()
      }
    });
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#7c2d12', '#1a1a1a']}
        style={styles.container}
      >
        <SafeAreaView style={[styles.safeArea, { paddingBottom: 0 }]} edges={['top', 'left', 'right']}>
          <View style={styles.loadingContainer}>
            <Text style={styles.appTitle}>FluxShorts</Text>
            <ActivityIndicator size="large" color="#fbbf24" />
            <Text style={styles.loadingText}>Loading movies...</Text>
          </View>
          <CustomFooter />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#7c2d12', '#1a1a1a']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 0 }]}
        >
          <Text style={styles.appTitle}>FluxShorts</Text>
          
          {featuredMovies.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Featured Movies</Text>
              <TouchableOpacity 
                style={styles.featuredVideo}
                onPress={() => navigateToVideo(featuredMovies[0])}
              >
                <Image source={{ uri: featuredMovies[0].thumbnailUrl }} style={styles.featuredImage} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={styles.featuredOverlay}
                >
                  <Text style={styles.featuredTitle}>{featuredMovies[0].title}</Text>
                  <Text style={styles.featuredMeta}>
                    {featuredMovies[0].metadata.genre} • {featuredMovies[0].metadata.year}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {recentMovies.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>More Movies</Text>
              <View style={styles.videoGrid}>
                {recentMovies.map((movie) => (
                  <TouchableOpacity
                    key={movie.id}
                    style={styles.gridItem}
                    onPress={() => navigateToVideo(movie)}
                  >
                    <Image source={{ uri: movie.thumbnailUrl }} style={styles.gridImage} />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.9)']}
                      style={styles.gridOverlay}
                    >
                      <Text style={styles.gridTitle}>{movie.title}</Text>
                      <Text style={styles.gridMeta}>
                        {movie.metadata.genre} • {movie.metadata.year}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
        <CustomFooter />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fbbf24',
    textAlign: 'center',
    paddingVertical: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  featuredVideo: {
    height: Dimensions.get('window').height * 0.6,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  featuredTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  featuredMeta: {
    color: '#d1d5db',
    fontSize: 14,
  },
  videoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '48%',
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  gridTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  gridMeta: {
    color: '#d1d5db',
    fontSize: 12,
  },
});