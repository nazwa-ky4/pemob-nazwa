import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { api } from './src/api';
import { rupiah, tanggalLokal, validate } from './src/helpers';

/**
 * KOMPONEN UTAMA (Entry Point)
 * Membungkus aplikasi dengan SafeAreaProvider untuk menangani area layar aman (notch/status bar).
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <Utama />
    </SafeAreaProvider>
  );
}

/**
 * KOMPONEN UTAMA (Utama)
 * Mengelola seluruh alur aplikasi, state data, operasi API, dan navigasi antar-layar.
 */
function Utama() {
  // =========================================================================
  // STATE MANAGEMENT (Penyimpanan Data Sementara)
  // =========================================================================
  
  // Menentukan layar yang aktif: 'list' (daftar), 'detail', 'create' (tambah), atau 'edit' (ubah)
  const [screen, setScreen] = useState('list');
  // Menyimpan daftar transaksi pengeluaran dari API
  const [items, setItems] = useState([]);
  // Menyimpan daftar kategori pengeluaran dari API
  const [categories, setCategories] = useState([]);
  // Menyimpan data 1 pengeluaran yang sedang dipilih untuk detail atau edit
  const [selected, setSelected] = useState(null);
  // Status memuat data daftar utama
  const [loading, setLoading] = useState(false);
  // Status pemrosesan transaksi (simpan/hapus/ambil detail)
  const [busy, setBusy] = useState(false);
  // Menyimpan pesan ralat/error jika terjadi masalah
  const [error, setError] = useState('');
  
  // State untuk penampung input pada form tambah/edit
  const [judul, setJudul] = useState('');
  const [nominal, setNominal] = useState('');
  const [categoryId, setCategoryId] = useState(null);

  // Lock ref: Mencegah eksekusi ganda (double-click/race condition) saat proses async berjalan
  const lock = useRef(false);

  // =========================================================================
  // FUNGSI LOGIKA DAN PEMANGGILAN API
  // =========================================================================

  /**
   * Mengambil daftar seluruh pengeluaran dari API.
   */
  async function load() {
    if (lock.current) return; // Hentikan jika sedang ada proses lain yang terkunci
    lock.current = true;
    setLoading(true);
    setError('');
    try {
      const rows = await api.list();
      if (!Array.isArray(rows)) throw new Error('Daftar harus berupa array');
      setItems(rows);
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false; // Buka kunci proses
      setLoading(false);
    }
  }

  // Memanggil fungsi load() secara otomatis saat aplikasi pertama kali dibuka
  useEffect(() => {
    load();
  }, []);

  /**
   * Menangani navigasi kembali ke layar sebelumnya.
   */
  function back() {
    if (lock.current) return;
    setError('');
    setScreen(screen === 'edit' ? 'detail' : 'list');
  }

  // Menangani tombol 'Back' fisik pada perangkat Android
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'list' && !lock.current) return false;
      back();
      return true;
    });
    return () => sub.remove();
  }, [screen]);

  /**
   * Mengambil detail satu transaksi pengeluaran berdasarkan ID dan membuka layar detail.
   */
  async function openDetail(id) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      setSelected(await api.detail(id));
      setScreen('detail');
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  /**
   * Mengambil daftar kategori, mengosongkan form input, dan membuka layar Tambah Pengeluaran.
   */
  async function openCreate() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const rows = await api.categories();
      if (!Array.isArray(rows)) throw new Error('Kategori harus berupa array');
      setCategories(rows);
      setJudul('');
      setNominal('');
      setCategoryId(null);
      setScreen('create');
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  /**
   * Mengisi form dengan data yang dipilih lalu membuka layar Ubah Pengeluaran.
   */
  function openEdit() {
    setJudul(selected.judul);
    setNominal(String(selected.nominal));
    setError('');
    setScreen('edit');
  }

  /**
   * Memvalidasi input, lalu menyimpan transaksi baru (create) atau pembaruan (update) ke API.
   */
  async function save() {
    if (lock.current) return;
    
    // Validasi form judul dan nominal
    const pesan = validate(judul, nominal);
    if (pesan) {
      setError(pesan);
      return;
    }

    lock.current = true;
    setBusy(true);
    setError('');
    let saved = false;
    try {
      const body = { judul: judul.trim(), nominal: Number(nominal) };
      if (screen === 'create') {
        await api.create({ ...body, id_kategori: categoryId });
      } else {
        await api.update(selected.id, body);
      }
      saved = true;
      setItems([]);
      setScreen('list');
      setSelected(null);
      
      // Ambil ulang data terbaru setelah berhasil disimpan
      const rows = await api.list();
      if (!Array.isArray(rows)) throw new Error('Daftar harus berupa array');
      setItems(rows);
    } catch (e) {
      setError(
        saved
          ? `Data tersimpan. Muat ulang daftar`
          : `${e.message}. Jika koneksi putus, cek daftar sebelum mengulang.`
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  /**
   * Menghapus transaksi pengeluaran dari API.
   */
  async function remove() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    let deleted = false;
    try {
      await api.remove(selected.id);
      deleted = true;
      setItems([]);
      setSelected(null);
      setScreen('list');
      
      // Ambil ulang data terbaru setelah berhasil dihapus
      const rows = await api.list();
      if (!Array.isArray(rows)) throw new Error('Daftar harus berupa array');
      setItems(rows);
    } catch (e) {
      setError(deleted ? `Data terhapus. Muat ulang daftar` : e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  /**
   * Menampilkan popup dialog konfirmasi bawaan HP sebelum menghapus data.
   */
  function confirmDelete() {
    Alert.alert('Hapus pengeluaran', `Hapus ${selected.judul}?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: remove },
    ]);
  }

  // Penanda untuk mematikan fungsi tombol jika aplikasi sedang sibuk/loading
  const disabled = loading || busy;

  // Judul header sesuai layar yang aktif
  const titles = {
    list: 'Pengeluaran',
    create: 'Tambah Pengeluaran',
    detail: 'Detail Pengeluaran',
    edit: 'Ubah Pengeluaran',
  };

  return (
    <SafeAreaView style={s.page}>
      {/* Menyesuaikan tampilan agar tidak terhalang oleh keyboard */}
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* =========================================================================
            HEADER APLIKASI
           ========================================================================= */}
        <View style={s.header}>
          {screen !== 'list' ? (
            <TouchableOpacity
              onPress={back}
              disabled={disabled}
              style={s.backButton}
            >
              <Text style={s.backIcon}>←</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
          <Text style={s.headerTitle}>{titles[screen]}</Text>
          <View style={s.avatarPlaceholder} />
        </View>

        {/* TAMPILAN PESAN ERROR (Jika Ada) */}
        {!!error && (
          <View style={s.errorContainer}>
            <Text accessibilityRole="alert" style={s.errorText}>
              {error}
            </Text>
          </View>
        )}

        {/* INDIKATOR MEMUAT DATA (Loading Overlay) */}
        {disabled && (
          <View style={s.loadingOverlay}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        )}

        {/* =========================================================================
            LAYAR 1: DAFTAR PENGELUARAN (screen === 'list')
           ========================================================================= */}
        {screen === 'list' && (
          <View style={s.flex}>
            {/* Component FlatList untuk menampilkan senarai data secara efisien */}
            <FlatList
              data={items}
              keyExtractor={(item) => String(item.id)}
              refreshing={loading}
              onRefresh={load} // Fitur tarik ke bawah untuk memuat ulang (Pull-to-refresh)
              contentContainerStyle={s.listPadding}
              
              // Tampilan jika data pengeluaran masih kosong
              ListEmptyComponent={
                !disabled && !error ? (
                  <View style={s.emptyContainer}>
                    <View style={s.emptyIconBag}>
                      <Text style={{ fontSize: 24 }}>📄</Text>
                    </View>
                    <Text style={s.emptyTitle}>Belum ada pengeluaran</Text>
                    <Text style={s.emptySubtitle}>
                      Tambahkan pengeluaran pertama Anda
                    </Text>
                  </View>
                ) : null
              }
              
              // Render tampilan tiap item dalam daftar
              renderItem={({ item }) => (
                <Pressable
                  style={s.card}
                  accessibilityRole="button"
                  disabled={disabled}
                  onPress={() => openDetail(item.id)}
                >
                  <View style={s.cardHeader}>
                    <View style={s.badge}>
                      <Text style={s.badgeText}>
                        {item.kategori || 'Tanpa kategori'}
                      </Text>
                    </View>
                    <Text style={s.cardDate}>
                      {tanggalLokal(item.tanggal)}
                    </Text>
                  </View>

                  <Text style={s.cardTitle}>{item.judul}</Text>
                  <Text style={s.cardAmount}>{rupiah(item.nominal)}</Text>

                  <View style={s.cardDivider} />
                  <TouchableOpacity
                    disabled={disabled}
                    onPress={() => openDetail(item.id)}
                  >
                    <Text style={s.linkText}>Lihat detail</Text>
                  </TouchableOpacity>
                </Pressable>
              )}
            />

            {/* Tombol aksi bagian bawah layar daftar */}
            <View style={s.footerContainer}>
              <TouchableOpacity
                style={s.btnPrimary}
                onPress={openCreate}
                disabled={disabled}
              >
                <Text style={s.btnPrimaryText}>+ Tambah</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.btnSecondary}
                onPress={load}
                disabled={disabled}
              >
                <Text style={s.btnSecondaryText}>Muat ulang</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* =========================================================================
            LAYAR 2: DETAIL PENGELUARAN (screen === 'detail')
           ========================================================================= */}
        {screen === 'detail' && selected && (
          <View style={s.flex}>
            <ScrollView contentContainerStyle={s.contentPadding}>
              <View style={s.detailCard}>
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>JUDUL</Text>
                  <Text style={s.detailValBold}>{selected.judul}</Text>
                </View>

                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>NOMINAL</Text>
                  <Text style={s.detailValBlue}>{rupiah(selected.nominal)}</Text>
                </View>

                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>TANGGAL</Text>
                  <Text style={s.detailVal}>
                    {tanggalLokal(selected.tanggal)}
                  </Text>
                </View>

                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>KATEGORI</Text>
                  <Text style={s.detailVal}>
                    {selected.id_kategori
                      ? `ID kategori ${selected.id_kategori}`
                      : 'Tanpa kategori'}
                  </Text>
                </View>

                <View style={[s.detailRow, { borderBottomWidth: 0 }]}>
                  <Text style={s.detailLabel}>CATATAN</Text>
                  <Text style={s.detailVal}>
                    {selected.catatan || '-'}
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Tombol aksi bagian bawah layar detail (Ubah & Hapus) */}
            <View style={s.footerContainer}>
              <TouchableOpacity
                style={s.btnPrimary}
                onPress={openEdit}
                disabled={disabled}
              >
                <Text style={s.btnPrimaryText}>Ubah</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.btnDanger}
                onPress={confirmDelete}
                disabled={disabled}
              >
                <Text style={s.btnDangerText}>Hapus</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* =========================================================================
            LAYAR 3 & 4: FORM TAMBAH & UBAH PENGELUARAN (screen === 'create' || 'edit')
           ========================================================================= */}
        {(screen === 'create' || screen === 'edit') && (
          <View style={s.flex}>
            <ScrollView
              contentContainerStyle={s.contentPadding}
              keyboardShouldPersistTaps="handled"
            >
              {/* Field Input Judul */}
              <View style={s.fieldGroup}>
                <Text style={s.label}>Judul</Text>
                <TextInput
                  style={[s.input, !!error && s.inputError]}
                  value={judul}
                  onChangeText={setJudul}
                  accessibilityLabel="Judul"
                  editable={!busy}
                  maxLength={100}
                  placeholder="Masukkan judul"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Field Input Nominal */}
              <View style={s.fieldGroup}>
                <Text style={s.label}>Nominal</Text>
                <TextInput
                  style={[s.input, !!error && s.inputError]}
                  value={nominal}
                  onChangeText={setNominal}
                  keyboardType="number-pad"
                  accessibilityLabel="Nominal rupiah"
                  editable={!busy}
                  placeholder="Masukkan nominal"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Pilihan Kategori (Hanya ditampilkan pada layar Tambah) */}
              {screen === 'create' ? (
                <View style={s.fieldGroup}>
                  <Text style={s.label}>Kategori</Text>
                  <View style={s.chipContainer}>
                    {[{ id: null, nama: 'Tanpa kategori' }, ...categories].map(
                      (k) => {
                        const isSelected = categoryId === k.id;
                        return (
                          <TouchableOpacity
                            key={String(k.id)}
                            disabled={busy}
                            onPress={() => setCategoryId(k.id)}
                            style={[
                              s.chip,
                              isSelected && s.chipSelected,
                            ]}
                          >
                            <Text
                              style={[
                                s.chipText,
                                isSelected && s.chipTextSelected,
                              ]}
                            >
                              {k.nama}
                            </Text>
                          </TouchableOpacity>
                        );
                      }
                    )}
                  </View>
                  <Text style={s.infoText}>
                    Tanggal otomatis dari server
                  </Text>
                </View>
              ) : (
                <Text style={s.infoText}>
                  API ubah hanya menerima judul dan nominal.
                </Text>
              )}
            </ScrollView>

            {/* Tombol Simpan Form */}
            <View style={s.footerContainer}>
              <TouchableOpacity
                style={[s.btnPrimary, busy && s.disabledBtn]}
                onPress={save}
                disabled={disabled}
              >
                <Text style={s.btnPrimaryText}>
                  {busy ? 'Menyimpan...' : 'Simpan'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// =========================================================================
// STYLESHEET (Gaya Tampilan UI)
// =========================================================================
const s = StyleSheet.create({
  flex: { flex: 1 },
  page: { flex: 1, backgroundColor: '#F3F4F6' },

  // Style Header
  header: {
    height: 56,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  backButton: {
    padding: 4,
  },
  backIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  avatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#9CA3AF',
  },

  // Style Padding Konten
  listPadding: {
    padding: 20,
    paddingBottom: 20,
  },
  contentPadding: {
    padding: 20,
  },

  // Style Card Item Pengeluaran
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  cardDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  cardAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3B82F6',
    marginBottom: 12,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 12,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },

  // Style Card Layar Detail
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 4,
  },
  detailValBold: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  detailValBlue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3B82F6',
  },
  detailVal: {
    fontSize: 15,
    color: '#111827',
  },

  // Style Input & Kategori Chip
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#111827',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  chipTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  infoText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },

  // Style Tombol-Tombol Bottom Footer
  footerContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  btnPrimary: {
    height: 48,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  btnSecondary: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  btnDanger: {
    height: 48,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDangerText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  disabledBtn: {
    opacity: 0.6,
  },

  // Style Tampilan Kosong & Error
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconBag: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
  },
  loadingOverlay: {
    paddingVertical: 10,
  },
});