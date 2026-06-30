/**
 * KPSS Aşkı - Oda Seçim Ekranı (Apple-minimalist)
 * v8: Daha iyi error/loading/empty state yönetimi
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Fonts, FontSize } from '../theme/typography';
import { Spacing, Radius } from '../theme/spacing';
import { useAuthStore } from '../stores/authStore';
import { useRoomStore } from '../stores/roomStore';
import { AppleButton } from '../components/AppleButton';
import { AppleCard } from '../components/AppleCard';
import type { Room } from '../types';

export function RoomSelectionScreen() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const {
    rooms,
    isLoading,
    error,
    loadRooms,
    join,
    create,
    delete: deleteRoomAction,
    subscribeToRooms,
    clearError,
  } = useRoomStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);

  useEffect(() => {
    loadRooms();
    const unsubscribe = subscribeToRooms();
    return () => {
      unsubscribe();
    };
  }, []);

  const handleJoin = async (roomId: string) => {
    if (!user) return;
    setJoiningRoomId(roomId);
    try {
      await join(user.id, roomId);
    } catch {
      // Hata roomStore'da
    }
    setJoiningRoomId(null);
  };

  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    await logout();
  };

  const handleCreate = async () => {
    if (!user) return;
    const trimmedName = newRoomName.trim();
    if (trimmedName.length < 2) {
      setCreateError('Oda adı en az 2 karakter olmalı');
      return;
    }
    setCreatingRoom(true);
    setCreateError(null);
    try {
      await create(user.id, trimmedName, newRoomDescription.trim() || undefined);
      setModalVisible(false);
      setNewRoomName('');
      setNewRoomDescription('');
    } catch (err: any) {
      setCreateError(err.message || 'Oda oluşturulamadı');
    }
    setCreatingRoom(false);
  };

  const handleDelete = (roomId: string, roomName: string) => {
    Alert.alert(
      'Odayı Sil',
      `"${roomName}" odasını silmek istediğine emin misin? Bu işlem geri alınamaz.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setDeletingRoomId(roomId);
            try {
              await deleteRoomAction(user.id, roomId);
            } catch {
              // Hata roomStore'da
            }
            setDeletingRoomId(null);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emoji}>🏠</Text>
            <Text style={styles.title}>Çalışma Odası Seç</Text>
            <Text style={styles.subtitle}>
              Bir odaya katıl, çalışma arkadaşlarınla{'\n'}birlikte motive ol
            </Text>
          </View>

          {/* Hata Mesajı */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <AppleButton
                title="Tekrar Dene"
                onPress={loadRooms}
                variant="secondary"
                size="small"
              />
            </View>
          )}

          {/* Yeni Oda Oluştur */}
          <AppleButton
            title="+ Yeni Oda Oluştur"
            onPress={() => setModalVisible(true)}
            variant="primary"
            size="large"
            style={styles.createButton}
          />

          {/* Çıkış Yap */}
          <AppleButton
            title="Çıkış Yap"
            onPress={handleLogout}
            variant="destructive"
            size="medium"
            style={styles.logoutButton}
          />

          {/* Yükleniyor */}
          {isLoading && rooms.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.systemBlue} />
              <Text style={styles.loadingText}>Odalar yükleniyor...</Text>
            </View>
          ) : rooms.length === 0 && !error ? (
            /* Boş durum */
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyText}>
                Henüz hiç oda yok.{'\n'}İlk odayı sen oluştur!
              </Text>
            </View>
          ) : (
            /* Oda Listesi */
            <View style={styles.roomList}>
              {rooms.map((room: Room) => {
                const isCreator = profile?.username === room.creator_username;
                const isDeleting = deletingRoomId === room.id;

                return (
                  <AppleCard
                    key={room.id}
                    style={styles.roomCard}
                    variant="grouped"
                  >
                    <View style={styles.roomInfo}>
                      <View style={styles.roomText}>
                        <Text style={styles.roomName}>{room.name}</Text>
                        {room.description ? (
                          <Text style={styles.roomDescription}>
                            {room.description}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.roomStats}>
                        <Text style={styles.memberCount}>
                          👥 {room.member_count ?? 0}
                        </Text>
                        <Text style={styles.activeCount}>
                          🟢 {room.active_member_count ?? 0} aktif
                        </Text>
                      </View>
                    </View>
                    <View style={styles.roomActions}>
                      <AppleButton
                        title={
                          joiningRoomId === room.id
                            ? 'Katılıyor...'
                            : 'Katıl'
                        }
                        onPress={() => handleJoin(room.id)}
                        variant="primary"
                        size="medium"
                        disabled={joiningRoomId !== null || isDeleting}
                        style={styles.joinButton}
                      />
                      {isCreator && (
                        <AppleButton
                          title={isDeleting ? 'Siliniyor...' : '🗑 Sil'}
                          onPress={() => handleDelete(room.id, room.name)}
                          variant="destructive"
                          size="small"
                          disabled={isDeleting}
                          style={styles.deleteButton}
                        />
                      )}
                    </View>
                  </AppleCard>
                );
              })}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Oda Oluşturma Modalı */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Yeni Oda Oluştur</Text>
            <Pressable onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Oda Adı</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: KPSS Matematik"
              placeholderTextColor={Colors.tertiaryLabel}
              value={newRoomName}
              onChangeText={(text) => {
                setNewRoomName(text);
                if (createError) setCreateError(null);
              }}
              autoCapitalize="sentences"
              maxLength={50}
              editable={!creatingRoom}
            />

            <Text style={styles.inputLabel}>Açıklama (opsiyonel)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Odanın amacı nedir?"
              placeholderTextColor={Colors.tertiaryLabel}
              value={newRoomDescription}
              onChangeText={setNewRoomDescription}
              multiline
              numberOfLines={3}
              maxLength={200}
              editable={!creatingRoom}
            />

            {createError && (
              <Text style={styles.modalError}>{createError}</Text>
            )}

            <AppleButton
              title={creatingRoom ? 'Oluşturuluyor...' : 'Oda Oluştur'}
              onPress={handleCreate}
              variant="primary"
              size="large"
              disabled={creatingRoom || newRoomName.trim().length < 2}
              style={styles.submitButton}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.systemBackground,
  },
  inner: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  emoji: {
    fontSize: 56,
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.display.bold,
    fontSize: FontSize.largeTitle,
    color: Colors.label,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Fonts.body.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryLabel,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  errorText: {
    fontFamily: Fonts.body.regular,
    fontSize: FontSize.subhead,
    color: Colors.systemRed,
    textAlign: 'center',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontFamily: Fonts.body.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryLabel,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontFamily: Fonts.body.regular,
    fontSize: FontSize.body,
    color: Colors.secondaryLabel,
    textAlign: 'center',
    lineHeight: 24,
  },
  roomList: {
    gap: Spacing.md,
  },
  roomCard: {
    gap: Spacing.md,
  },
  roomActions: {
    flexDirection: 'column',
    gap: Spacing.xs,
  },
  joinButton: {
    width: '100%',
  },
  deleteButton: {
    width: '100%',
  },
  roomInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  roomText: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  roomName: {
    fontFamily: Fonts.body.bold,
    fontSize: FontSize.title3,
    color: Colors.label,
    marginBottom: 4,
  },
  roomDescription: {
    fontFamily: Fonts.body.regular,
    fontSize: FontSize.footnote,
    color: Colors.secondaryLabel,
    lineHeight: 18,
  },
  roomStats: {
    alignItems: 'flex-end',
    gap: 4,
  },
  memberCount: {
    fontFamily: Fonts.body.semibold,
    fontSize: FontSize.caption1,
    color: Colors.secondaryLabel,
  },
  activeCount: {
    fontFamily: Fonts.body.semibold,
    fontSize: FontSize.caption1,
    color: Colors.systemGreen,
  },
  createButton: {
    marginBottom: Spacing.md,
    width: '100%',
  },
  logoutButton: {
    marginBottom: Spacing.xxl,
    width: '100%',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.systemBackground,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separator,
  },
  modalTitle: {
    fontFamily: Fonts.display.bold,
    fontSize: FontSize.title3,
    color: Colors.label,
  },
  closeButton: {
    fontSize: FontSize.title2,
    color: Colors.systemBlue,
    padding: 4,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  inputLabel: {
    fontFamily: Fonts.body.semibold,
    fontSize: FontSize.subhead,
    color: Colors.label,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.systemGray6,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontFamily: Fonts.body.regular,
    fontSize: FontSize.body,
    color: Colors.label,
    marginBottom: Spacing.md,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalError: {
    fontFamily: Fonts.body.regular,
    fontSize: FontSize.footnote,
    color: Colors.systemRed,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  submitButton: {
    marginTop: Spacing.xs,
    width: '100%',
  },
});
