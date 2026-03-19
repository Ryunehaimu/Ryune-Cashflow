import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View
} from 'react-native';
import { auth } from '../../firebaseConfig';
import { addTransaction, getWallets, Wallet } from '../../services/firestore';

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Health', 'Bills', 'Entertainment', 'Salary', 'Investment', 'Other'];

export default function ModalScreen() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [selectedCategoryChip, setSelectedCategoryChip] = useState('Food');
  const [customCategoryText, setCustomCategoryText] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const router = useRouter();

  const formatCurrency = (val: string) => {
    if (!val) return '';
    const numberString = val.replace(/[^0-9]/g, '');
    return numberString.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleAmountChange = (text: string) => {
    setAmount(formatCurrency(text));
  };

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    if (!auth.currentUser) return;
    try {
      const data = await getWallets(auth.currentUser.uid);
      setWallets(data);
      if (data.length > 0) setSelectedWalletId(data[0].id!);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your camera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const handleReceiptPick = () => {
    Alert.alert('Add Receipt', 'Choose a method', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    const finalCategory = selectedCategoryChip === 'Other' ? customCategoryText : selectedCategoryChip;
    if (!amount || !finalCategory || !selectedWalletId) {
      Alert.alert('Missing fields', 'Please fill in amount, category and select a wallet');
      return;
    }
    if (!auth.currentUser) return;

    setSaving(true);
    try {
      await addTransaction(
        {
          userId: auth.currentUser.uid,
          walletId: selectedWalletId,
          amount: parseFloat(amount.replace(/\./g, '')),
          type,
          category: finalCategory,
          description,
          date: transactionDate,
        },
        selectedWalletId
      );
      setAmount('');
      setDescription('');
      setReceiptUri(null);
      router.navigate('/(tabs)');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  const selectedWallet = wallets.find(w => w.id === selectedWalletId);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>New Transaction</Text>
          <Text style={styles.headerSub}>Track your {type === 'expense' ? 'spending' : 'income'}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Type Toggle */}
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, type === 'expense' && styles.toggleBtnExpenseActive]}
            onPress={() => setType('expense')}
          >
            <Ionicons name="arrow-up-circle" size={16} color={type === 'expense' ? '#ef4444' : '#666'} />
            <Text style={[styles.toggleText, type === 'expense' ? { color: '#ef4444' } : { color: '#666' }]}>Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, type === 'income' && styles.toggleBtnIncomeActive]}
            onPress={() => setType('income')}
          >
            <Ionicons name="arrow-down-circle" size={16} color={type === 'income' ? '#10b981' : '#666'} />
            <Text style={[styles.toggleText, type === 'income' ? { color: '#10b981' } : { color: '#666' }]}>Income</Text>
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>Rp</Text>
          <TextInput
            placeholder="0"
            value={amount}
            onChangeText={handleAmountChange}
            keyboardType="numeric"
            style={styles.amountInput}
            placeholderTextColor="#444"
          />
        </View>

        {/* Wallet Selector */}
        <Text style={styles.sectionLabel}>WALLET</Text>
        <TouchableOpacity style={styles.walletSelector} onPress={() => setShowWalletPicker(!showWalletPicker)}>
          <View style={styles.walletSelectorLeft}>
            <View style={styles.walletIcon}>
              <Ionicons name="wallet" size={18} color="#fff" />
            </View>
            <View>
              <Text style={styles.walletName}>{selectedWallet?.name ?? 'Select Wallet'}</Text>
              {selectedWallet && (
                <Text style={styles.walletBalance}>Rp {selectedWallet.balance.toLocaleString('id-ID')}</Text>
              )}
            </View>
          </View>
          <Ionicons name={showWalletPicker ? 'chevron-up' : 'chevron-down'} size={18} color="#666" />
        </TouchableOpacity>

        {showWalletPicker && (
          <View style={styles.walletDropdown}>
            {wallets.map(w => (
              <TouchableOpacity
                key={w.id}
                style={[styles.walletOption, w.id === selectedWalletId && styles.walletOptionActive]}
                onPress={() => { setSelectedWalletId(w.id!); setShowWalletPicker(false); }}
              >
                <Text style={styles.walletOptionName}>{w.name}</Text>
                <Text style={styles.walletOptionBalance}>Rp {w.balance.toLocaleString('id-ID')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Date */}
        <Text style={styles.sectionLabel}>DATE</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowDatePicker(true)}
          className="flex-row items-center justify-between"
        >
          <Text className="text-black dark:text-gray-300 font-semibold text-base">
            {transactionDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
          <Ionicons name="calendar-outline" size={20} color="#666" />
        </TouchableOpacity>



        {/* Category */}
        <Text style={styles.sectionLabel}>CATEGORY</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, selectedCategoryChip === cat && styles.categoryChipActive]}
              onPress={() => setSelectedCategoryChip(cat)}
            >
              <Text style={[styles.categoryChipText, selectedCategoryChip === cat && styles.categoryChipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Custom category */}
        {selectedCategoryChip === 'Other' && (
          <TextInput
            placeholder="Type your custom category here..."
            value={customCategoryText}
            onChangeText={setCustomCategoryText}
            style={[styles.input, { borderColor: '#ef4444' }]}
            placeholderTextColor="#888"
            autoFocus
          />
        )}

        {/* Description */}
        <Text style={styles.sectionLabel}>NOTE</Text>
        <TextInput
          placeholder="Add a note (optional)"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={2}
          style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
          placeholderTextColor="#555"
        />

        {/* Receipt */}
        <Text style={styles.sectionLabel}>RECEIPT / NOTA</Text>
        <TouchableOpacity style={styles.receiptPicker} onPress={handleReceiptPick}>
          {receiptUri ? (
            <Image source={{ uri: receiptUri }} style={styles.receiptImage} resizeMode="cover" />
          ) : (
            <View style={styles.receiptPlaceholder}>
              <Ionicons name="camera" size={28} color="#555" />
              <Text style={styles.receiptPlaceholderText}>Tap to add receipt photo</Text>
            </View>
          )}
        </TouchableOpacity>
        {receiptUri && (
          <TouchableOpacity onPress={() => setReceiptUri(null)} style={styles.removeReceiptBtn}>
            <Ionicons name="trash-outline" size={14} color="#ef4444" />
            <Text style={{ color: '#ef4444', marginLeft: 4, fontSize: 13 }}>Remove photo</Text>
          </TouchableOpacity>
        )}

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: type === 'expense' ? '#ef4444' : '#10b981' }]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Save {type === 'expense' ? 'Expense' : 'Income'}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* DateTimePicker outside ScrollView to prevent NavigationContainer error */}
      {showDatePicker && (
        <Modal
          transparent
          animationType="fade"
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          >
            <View style={{ backgroundColor: '#1c1c1e', paddingBottom: Platform.OS === 'ios' ? 30 : 0 }}>
              <DateTimePicker
                value={transactionDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                themeVariant="dark"
                onChange={(event: any, selectedDate?: Date) => {
                  if (Platform.OS === 'android') {
                    setShowDatePicker(false);
                    if (selectedDate) setTransactionDate(selectedDate);
                  } else if (selectedDate) {
                    setTransactionDate(selectedDate);
                  }
                }}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  style={{ alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: '#2c2c2e' }}
                >
                  <Text style={{ fontWeight: '700', fontSize: 16, color: '#007AFF' }}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 24,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  toggleBtnExpenseActive: {
    backgroundColor: '#1a0a0a',
  },
  toggleBtnIncomeActive: {
    backgroundColor: '#0a1a0f',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    gap: 8,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '900',
    color: '#444',
  },
  amountInput: {
    fontSize: 52,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -2,
    minWidth: 100,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#555',
    marginBottom: 10,
  },
  walletSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  walletSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  walletIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#3730a3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  walletBalance: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  walletDropdown: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  walletOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e',
  },
  walletOptionActive: {
    backgroundColor: '#2c2c2e',
  },
  walletOptionName: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  walletOptionBalance: {
    color: '#666',
    fontSize: 13,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1c1c1e',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  categoryChipActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  categoryChipText: {
    color: '#888',
    fontWeight: '600',
    fontSize: 13,
  },
  categoryChipTextActive: {
    color: '#000',
  },
  input: {
    backgroundColor: '#1c1c1e',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  receiptPicker: {
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    overflow: 'hidden',
    height: 160,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    borderStyle: 'dashed',
  },
  receiptImage: {
    width: '100%',
    height: '100%',
  },
  receiptPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  receiptPlaceholderText: {
    color: '#555',
    fontSize: 14,
  },
  removeReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    marginTop: 8,
    gap: 8,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: -0.3,
  },
});
