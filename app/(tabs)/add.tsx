import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
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
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

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
      <View className="flex-1 justify-center items-center bg-[#fafafa] dark:bg-[#0a0a0a]">
        <ActivityIndicator size="large" color={isDark ? "#fff" : "#000"} />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#fafafa] dark:bg-[#0a0a0a]" style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
      {/* Header */}
      <View className="px-6 py-5 flex-row items-center border-b border-gray-100 dark:border-[#1c1c1e]">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="chevron-back" size={24} color={isDark ? "#fff" : "#000"} />
        </TouchableOpacity>
        <View className="ml-2">
          <Text className="text-xl font-bold text-black dark:text-white tracking-tight">New Record</Text>
          <Text className="text-gray-400 text-xs font-bold uppercase tracking-widest">{type}</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
      >

        {/* Type Toggle */}
        <View className="flex-row bg-gray-100 dark:bg-[#1c1c1e] rounded-2xl p-1 mb-8">
          <TouchableOpacity
            className={`flex-1 flex-row py-3 rounded-xl items-center justify-center gap-1.5 ${type === 'expense' ? 'bg-red-50 dark:bg-[#1a0a0a]' : ''}`}
            onPress={() => setType('expense')}
          >
            <Ionicons name="arrow-up-circle" size={16} color={type === 'expense' ? '#ef4444' : '#9ca3af'} />
            <Text className={`font-bold text-sm ${type === 'expense' ? 'text-[#ef4444]' : 'text-gray-400 dark:text-[#666]'}`}>Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 flex-row py-3 rounded-xl items-center justify-center gap-1.5 ${type === 'income' ? 'bg-emerald-50 dark:bg-[#0a1a0f]' : ''}`}
            onPress={() => setType('income')}
          >
            <Ionicons name="arrow-down-circle" size={16} color={type === 'income' ? '#10b981' : '#9ca3af'} />
            <Text className={`font-bold text-sm ${type === 'income' ? 'text-[#10b981]' : 'text-gray-500 dark:text-[#666]'}`}>Income</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Amount Card */}
        <View 
          className={`px-6 py-10 rounded-[40px] mb-8 items-center justify-center shadow-2xl ${type === 'expense' ? 'bg-red-500' : 'bg-emerald-500'}`}
          style={{ shadowColor: type === 'expense' ? '#ef4444' : '#10b981', shadowOpacity: 0.3, shadowRadius: 20 }}
        >
          <Text className="text-white/70 font-bold text-xs uppercase tracking-[4px] mb-2">AMOUNT</Text>
          <View className="flex-row items-center justify-center gap-2">
            <Text className="text-3xl font-black text-white/50">Rp</Text>
            <TextInput
              placeholder="0"
              value={amount}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
              className="text-5xl font-extrabold text-white tracking-tighter min-w-[150px] text-center"
              placeholderTextColor="rgba(255,255,255,0.3)"
              selectionColor="#fff"
            />
          </View>
        </View>

        {/* Section 1: Wallet & Date */}
        <View className="bg-white dark:bg-[#111] p-6 rounded-[32px] mb-6 shadow-sm border border-gray-100 dark:border-[#222]">
          <Text className="text-[12px] font-black tracking-[2px] text-gray-400 mb-4 uppercase">SOURCES</Text>
          
          <TouchableOpacity
            className="flex-row justify-between items-center bg-gray-50 dark:bg-[#1a1a1a] px-4 py-4 rounded-2xl mb-4 border border-blue-50/50 dark:border-[#333]"
            onPress={() => setShowWalletPicker(!showWalletPicker)}
          >
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-blue-600 items-center justify-center shadow-lg shadow-blue-500/20">
                <Ionicons name="wallet" size={20} color="#fff" />
              </View>
              <View>
                <Text className="text-base font-bold text-black dark:text-white">{selectedWallet?.name ?? 'Select Wallet'}</Text>
                {selectedWallet && (
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Rp {selectedWallet.balance.toLocaleString('id-ID')}</Text>
                )}
              </View>
            </View>
            <Ionicons name={showWalletPicker ? 'chevron-up' : 'chevron-down'} size={18} color="#999" />
          </TouchableOpacity>

          {showWalletPicker && (
            <View className="bg-white dark:bg-[#1c1c1e] rounded-[24px] overflow-hidden mb-4 border border-gray-100 dark:border-[#2c2c2e] shadow-2xl shadow-black/10">
              {wallets.map(w => (
                <TouchableOpacity
                  key={w.id}
                  className={`flex-row justify-between items-center p-5 ${w.id === selectedWalletId ? 'bg-blue-50/50 dark:bg-[#2c2c2e]' : ''} border-b border-gray-50 dark:border-[#2c2c2e]`}
                  onPress={() => { setSelectedWalletId(w.id!); setShowWalletPicker(false); }}
                >
                  <View className="flex-row items-center gap-3">
                    <View className={`w-3 h-3 rounded-full border-2 border-white dark:border-[#1c1c1e] ${w.id === selectedWalletId ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
                    <Text className={`font-bold text-base ${w.id === selectedWalletId ? 'text-blue-600 dark:text-blue-400' : 'text-black dark:text-white'}`}>{w.name}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">BALANCE</Text>
                    <Text className="text-gray-900 dark:text-gray-200 text-sm font-black">Rp {w.balance.toLocaleString('id-ID')}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            className="flex-row items-center justify-between bg-gray-50 dark:bg-[#1a1a1a] px-5 py-4 rounded-2xl border border-transparent dark:border-[#333]"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#333] items-center justify-center">
                <Ionicons name="calendar" size={20} color="#6366f1" />
              </View>
              <View>
                <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">TRANSACTION DATE</Text>
                <Text className="text-black dark:text-gray-200 font-bold text-base mt-0.5">
                  {transactionDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </TouchableOpacity>
        </View>



        {/* Section 2: Details */}
        <View className="bg-white dark:bg-[#111] p-6 rounded-[32px] mb-6 shadow-sm border border-gray-100 dark:border-[#222]">
          <Text className="text-[12px] font-black tracking-[2px] text-gray-400 mb-4 uppercase">DETAILS</Text>

          {/* Category */}
          <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">CATEGORY</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                className={`px-4 py-2 rounded-full mr-2 border ${selectedCategoryChip === cat ? 'bg-blue-600 border-blue-600' : 'bg-gray-100 dark:bg-[#1c1c1e] border-gray-200 dark:border-[#2c2c2e]'}`}
                onPress={() => setSelectedCategoryChip(cat)}
              >
                <Text className={`font-bold text-xs ${selectedCategoryChip === cat ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Custom category */}
          {selectedCategoryChip === 'Other' && (
            <TextInput
              placeholder="Type your custom category..."
              value={customCategoryText}
              onChangeText={setCustomCategoryText}
              onFocus={() => setFocusedInput('customCat')}
              onBlur={() => setFocusedInput(null)}
              className={`bg-gray-50 dark:bg-[#1a1a1a] text-black dark:text-white px-5 py-4 rounded-2xl mb-4 font-bold border-2 ${focusedInput === 'customCat' ? 'border-blue-500' : 'border-transparent'}`}
              placeholderTextColor="#9ca3af"
              autoFocus
            />
          )}

          {/* Description / Note */}
          <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">ADDITIONAL NOTE</Text>
          <TextInput
            placeholder="What was this for?"
            value={description}
            onChangeText={setDescription}
            onFocus={() => setFocusedInput('desc')}
            onBlur={() => setFocusedInput(null)}
            multiline
            numberOfLines={2}
            className={`bg-gray-50 dark:bg-[#1a1a1a] text-black dark:text-white px-5 py-4 rounded-2xl font-medium h-24 text-top border-2 ${focusedInput === 'desc' ? 'border-blue-500' : 'border-transparent'}`}
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Section 3: Attachment */}
        <View className="bg-white dark:bg-[#111] p-6 rounded-[32px] mb-6 shadow-sm border border-gray-100 dark:border-[#222]">
          <Text className="text-[12px] font-black tracking-[2px] text-gray-400 mb-4 uppercase">ATTACHMENT</Text>
          
          <TouchableOpacity
            className="bg-gray-50 dark:bg-[#1a1a1a] rounded-[24px] overflow-hidden h-44 border-2 border-dashed border-gray-200 dark:border-[#333] items-center justify-center"
            onPress={handleReceiptPick}
          >
            {receiptUri ? (
              <Image source={{ uri: receiptUri }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <View className="items-center gap-3">
                <View className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-900/20 items-center justify-center">
                  <Ionicons name="camera" size={28} color="#2563eb" />
                </View>
                <View className="items-center">
                  <Text className="text-gray-900 dark:text-gray-200 font-bold text-sm">Add Receipt Photo</Text>
                  <Text className="text-gray-400 text-xs mt-1">Optional for your records</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
          
          {receiptUri && (
            <TouchableOpacity 
              onPress={() => setReceiptUri(null)} 
              className="flex-row items-center justify-center mt-4 bg-red-50 dark:bg-red-900/20 py-2.5 rounded-xl border border-red-100 dark:border-red-900/30"
            >
              <Ionicons name="trash-outline" size={14} color="#ef4444" />
              <Text className="text-red-500 font-bold ml-2 text-xs">Remove Attachment</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{ 
            backgroundColor: type === 'expense' ? '#ef4444' : '#10b981',
            shadowColor: type === 'expense' ? '#ef4444' : '#10b981',
            shadowOpacity: 0.4,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 8 }
          }}
          className="py-4.5 rounded-[24px] mt-4 mb-2 items-center shadow-xl"
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View className="flex-row items-center gap-2">
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text className="text-white font-black text-lg tracking-tight uppercase">Save {type === 'expense' ? 'Expense' : 'Income'}</Text>
            </View>
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
