import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, SafeAreaView, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useFocusEffect } from 'expo-router';
import { auth } from '../../firebaseConfig';
import { addDebt, addTransaction, Debt, deleteDebt, getDebts, getWallets, updateDebtStatus, Wallet } from '../../services/firestore';

export default function DebtsScreen() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'given' | 'taken'>('given');
  const [adding, setAdding] = useState(false);
  const [debtDate, setDebtDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Settlement state
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [settlingWalletId, setSettlingWalletId] = useState<string>('');
  const [settling, setSettling] = useState(false);

  const formatCurrency = (val: string) => {
    if (!val) return '';
    const numberString = val.replace(/[^0-9]/g, '');
    return numberString.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleAmountChange = (text: string) => {
    setAmount(formatCurrency(text));
  };

  // View state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useFocusEffect(
    useCallback(() => {
      loadDebts();
    }, [])
  );

  const loadDebts = async () => {
    if (!auth.currentUser) return;
    try {
      const data = await getDebts(auth.currentUser.uid);
      setDebts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDebt = async () => {
    if (!person || !amount) {
      Alert.alert('Error', 'Please fill person and amount');
      return;
    }
    if (!auth.currentUser) return;

    setAdding(true);
    try {
      await addDebt({
        userId: auth.currentUser.uid,
        person,
        amount: parseFloat(amount.replace(/\./g, '')),
        description,
        type,
        isPaid: false,
        date: debtDate
      });
      setPerson('');
      setAmount('');
      setDescription('');
      setDebtDate(new Date());
      loadDebts();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to add debt record');
    } finally {
      setAdding(false);
    }
  };

  const toggleStatus = async (debt: Debt) => {
    if (debt.isPaid) {
      // Unsettle: just toggle the flag
      try {
        await updateDebtStatus(debt.id!, false);
        loadDebts();
      } catch (e) {
        console.error(e);
      }
    } else {
      // Settle: show modal to pick wallet
      if (!auth.currentUser) return;
      try {
        const userWallets = await getWallets(auth.currentUser.uid);
        setWallets(userWallets);
        if (userWallets.length > 0) setSettlingWalletId(userWallets[0].id!);
        setSelectedDebt(debt);
        setShowSettleModal(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleConfirmSettlement = async () => {
    if (!selectedDebt || !settlingWalletId || !auth.currentUser) return;

    setSettling(true);
    try {
      // 1. Record Transaction
      await addTransaction({
        userId: auth.currentUser.uid,
        walletId: settlingWalletId,
        amount: selectedDebt.amount,
        type: selectedDebt.type === 'given' ? 'income' : 'expense',
        category: 'Debt Settlement',
        description: `Settled: ${selectedDebt.person}${selectedDebt.description ? ` (${selectedDebt.description})` : ''}`,
        date: new Date()
      }, settlingWalletId);

      // 2. Update Debt Status
      await updateDebtStatus(selectedDebt.id!, true);

      // 3. Cleanup
      setShowSettleModal(false);
      setSelectedDebt(null);
      loadDebts();
      Alert.alert('Success', 'Debt settled and transaction recorded!');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to settle debt');
    } finally {
      setSettling(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Record', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteDebt(id);
            loadDebts();
          } catch (error) {
            console.error(error);
          }
        }
      }
    ]);
  };

  const { colorScheme } = useColorScheme();

  const totalGiven = debts.filter(d => d.type === 'given' && !d.isPaid).reduce((s, d) => s + d.amount, 0);
  const totalTaken = debts.filter(d => d.type === 'taken' && !d.isPaid).reduce((s, d) => s + d.amount, 0);
  const netPosition = totalGiven - totalTaken;
  const pendingCount = debts.filter(d => !d.isPaid).length;
  const settledCount = debts.filter(d => d.isPaid).length;

  const formatAmount = (val: number) => {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}jt`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(0)}rb`;
    return val.toLocaleString('id-ID');
  };

  const totalPages = Math.max(1, Math.ceil(debts.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDebts = debts.slice(startIndex, startIndex + itemsPerPage);

  const handleNext = () => { if (currentPage < totalPages) setCurrentPage(p => p + 1); };
  const handlePrev = () => { if (currentPage > 1) setCurrentPage(p => p - 1); };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#fafafa] dark:bg-[#0a0a0a]">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#fafafa] dark:bg-[#0a0a0a]" style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
      {/* Header */}
      <View className="px-6 pt-6 pb-2">
        <Text className="text-3xl font-black text-black dark:text-white tracking-tighter">Obligations</Text>
        <Text className="text-gray-500 mt-1 font-medium pb-4">Track money you owe or are owed</Text>
      </View>

      <ScrollView
        className="flex-1 px-6 pb-12"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
      >

        {/* Debt Summary Card */}
        <View
          className="rounded-[32px] mb-8 overflow-hidden"
          style={{ backgroundColor: netPosition >= 0 ? '#10b981' : '#ef4444' }}
        >
          {/* Top section */}
          <View className="px-6 pt-6 pb-4">
            <Text className="text-white/70 text-xs font-bold uppercase tracking-[3px] mb-1">Net Position</Text>
            <Text className="text-4xl font-black text-white tracking-tight">
              {netPosition >= 0 ? '+' : '-'} Rp {formatAmount(Math.abs(netPosition))}
            </Text>
            <Text className="text-white/70 text-sm mt-1 font-medium">
              {netPosition >= 0 ? 'People owe you more than you owe' : 'You owe more than people owe you'}
            </Text>
          </View>

          {/* Stats Row */}
          <View
            className="flex-row"
            style={{ backgroundColor: 'rgba(0,0,0,0.12)' }}
          >
            <View className="flex-1 py-4 items-center border-r border-white/10">
              <Text className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">RECEIVABLE</Text>
              <Text className="text-white font-black text-lg">Rp {formatAmount(totalGiven)}</Text>
              <Text className="text-white/60 text-xs mt-0.5">Others owe you</Text>
            </View>
            <View className="flex-1 py-4 items-center border-r border-white/10">
              <Text className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">PAYABLE</Text>
              <Text className="text-white font-black text-lg">Rp {formatAmount(totalTaken)}</Text>
              <Text className="text-white/60 text-xs mt-0.5">You owe others</Text>
            </View>
            <View className="flex-1 py-4 items-center">
              <Text className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">STATUS</Text>
              <Text className="text-white font-black text-lg">{pendingCount} Pending</Text>
              <Text className="text-white/60 text-xs mt-0.5">{settledCount} Settled</Text>
            </View>
          </View>
        </View>

        {/* Add Record Form */}
        <View className="bg-white dark:bg-[#111] p-6 rounded-[32px] shadow-sm mb-8 border border-gray-100 dark:border-[#222]">
          <Text className="text-base font-bold text-black dark:text-white mb-4">New Record</Text>

          <View className="flex-row bg-gray-100 dark:bg-[#1c1c1e] rounded-2xl p-1 mb-6">
            <TouchableOpacity
              className={`flex-1 flex-row py-3 rounded-xl items-center justify-center gap-1.5 ${type === 'given' ? 'bg-red-50 dark:bg-[#1a0a0a]' : ''}`}
              onPress={() => setType('given')}
            >
              <Ionicons name="arrow-up-circle" size={16} color={type === 'given' ? '#ef4444' : '#9ca3af'} />
              <Text className={`font-bold text-sm ${type === 'given' ? 'text-[#ef4444]' : 'text-gray-400 dark:text-[#666]'}`}>I Lent</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 flex-row py-3 rounded-xl items-center justify-center gap-1.5 ${type === 'taken' ? 'bg-emerald-50 dark:bg-[#0a1a0f]' : ''}`}
              onPress={() => setType('taken')}
            >
              <Ionicons name="arrow-down-circle" size={16} color={type === 'taken' ? '#10b981' : '#9ca3af'} />
              <Text className={`font-bold text-sm ${type === 'taken' ? 'text-[#10b981]' : 'text-gray-500 dark:text-[#666]'}`}>I Borrowed</Text>
            </TouchableOpacity>
          </View>

          {/* Date Picker Field */}
          <Text className="text-[11px] font-bold tracking-widest text-gray-500 mb-2 uppercase">
            {type === 'given' ? 'Lent Date' : 'Due Date'}
          </Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            className="bg-[#f4f4f5] dark:bg-[#222] px-5 py-4 rounded-2xl mb-3 flex-row items-center justify-between border border-transparent dark:border-[#333]"
          >
            <Text className="text-black dark:text-gray-200 font-semibold text-base">
              {debtDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#666" />
          </TouchableOpacity>

          <TextInput
            placeholder={type === 'given' ? "Who did you lend to?" : "Who did you borrow from?"}
            value={person}
            onChangeText={setPerson}
            className="bg-[#f4f4f5] dark:bg-[#222] text-black dark:text-white px-5 py-4 rounded-2xl mb-3 font-medium text-base"
            placeholderTextColor="#9ca3af"
          />
          <TextInput
            placeholder="Amount"
            value={amount}
            onChangeText={handleAmountChange}
            keyboardType="numeric"
            className="bg-[#f4f4f5] dark:bg-[#222] text-black dark:text-white px-5 py-4 rounded-2xl mb-3 font-medium text-base"
            placeholderTextColor="#9ca3af"
          />
          <TextInput
            placeholder="Note (optional)"
            value={description}
            onChangeText={setDescription}
            className="bg-[#f4f4f5] dark:bg-[#222] text-black dark:text-white px-5 py-4 rounded-2xl mb-6 font-medium text-base"
            placeholderTextColor="#9ca3af"
          />

          <TouchableOpacity
            onPress={handleAddDebt}
            disabled={adding}
            className="bg-blue-600 py-4 rounded-2xl items-center shadow-md shadow-blue-500/20 mt-2"
          >
            {adding ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-base">Save Record</Text>}
          </TouchableOpacity>
        </View>

        {/* Header Record */}
        <View className="flex-row justify-between items-end mb-4">
          <Text className="text-xl font-bold text-black dark:text-white tracking-tight">Records</Text>
        </View>

        {/* List of Debts */}
        <View className="bg-white dark:bg-[#111] rounded-[32px] p-2 mb-12 shadow-sm border border-gray-100 dark:border-[#222]">
          {debts.length === 0 ? (
            <View className="py-12 items-center">
              <Ionicons name="document-text-outline" size={40} color="#cbd5e1" className="dark:text-gray-700" />
              <Text className="text-gray-400 dark:text-gray-600 font-medium mt-4">Belum ada catatan utang/piutang.</Text>
            </View>
          ) : (
            <View>
              {paginatedDebts.map((item, i) => (
                <View key={item.id} className={`p-4 flex-row items-center ${i !== paginatedDebts.length - 1 ? 'border-b border-gray-100 dark:border-gray-800/60' : ''}`}>
                  <View className={`w-12 h-12 flex-shrink-0 rounded-full items-center justify-center mr-4 ${item.type === 'given' ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-rose-100 dark:bg-rose-500/20'}`}>
                    <Ionicons name={item.type === 'given' ? 'arrow-up' : 'arrow-down'} size={20} color={item.type === 'given' ? '#10b981' : '#ef4444'} />
                  </View>

                  <View className="flex-1 mr-4">
                    <Text className="text-lg font-bold text-black dark:text-white mb-0.5">{item.person}</Text>
                    <View className="flex-row items-center mb-1">
                      <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
                      <Text className="text-gray-400 text-xs ml-1">
                        {typeof item.date?.toDate === 'function'
                          ? item.date.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                          : item.date instanceof Date
                            ? item.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                            : 'Baru saja'}
                      </Text>
                    </View>
                    {item.description ? <Text className="text-gray-400 text-xs text-gray-400 mb-2 italic" numberOfLines={1}>"{item.description}"</Text> : null}
                    <Text className={`text-xl font-black tracking-tight ${item.type === 'given' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      Rp {item.amount.toLocaleString('id-ID')}
                    </Text>
                  </View>

                  <View className="items-end space-y-2">
                    <TouchableOpacity onPress={() => toggleStatus(item)}>
                      <View className={`px-3 py-1.5 rounded-full ${item.isPaid ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-amber-100 dark:bg-amber-500/20'}`}>
                        <Text className={`text-xs font-bold ${item.isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {item.isPaid ? 'Settled' : 'Pending'}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleDelete(item.id!)} className="p-2 border border-gray-200 dark:border-[#333] rounded-full mt-2">
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <View className="flex-row items-center justify-between mt-2 pt-4 pb-2 px-4 border-t border-gray-100 dark:border-gray-800/60">
                  <TouchableOpacity
                    onPress={handlePrev}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-xl ${currentPage === 1 ? 'opacity-30' : 'bg-gray-100 dark:bg-[#222]'}`}
                  >
                    <Text className="text-black dark:text-white font-bold text-sm">Prev</Text>
                  </TouchableOpacity>

                  <View className="flex-row items-center">
                    <Text className="text-gray-400 font-medium text-sm">Page </Text>
                    <Text className="text-blue-600 dark:text-blue-400 font-bold text-lg">{currentPage}</Text>
                    <Text className="text-gray-400 font-medium text-sm"> / {totalPages}</Text>
                  </View>

                  <TouchableOpacity
                    onPress={handleNext}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 rounded-xl ${currentPage === totalPages ? 'opacity-30' : 'bg-gray-100 dark:bg-[#222]'}`}
                  >
                    <Text className="text-black dark:text-white font-bold text-sm">Next</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <Modal transparent animationType="fade" visible={showDatePicker}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
            onPress={() => setShowDatePicker(false)}
          >
            <View style={{ backgroundColor: '#1c1c1e', paddingBottom: Platform.OS === 'ios' ? 30 : 0 }}>
              <DateTimePicker
                value={debtDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                themeVariant="dark"
                onChange={(event, selectedDate) => {
                  if (Platform.OS === 'android') {
                    setShowDatePicker(false);
                    if (selectedDate) setDebtDate(selectedDate);
                  } else if (selectedDate) {
                    setDebtDate(selectedDate);
                  }
                }}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity onPress={() => setShowDatePicker(false)} style={{ alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: '#2c2c2e' }}>
                  <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Wallet Selection Modal for Settlement */}
      <Modal
        visible={showSettleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettleModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View className="bg-white dark:bg-[#1c1c1e] rounded-t-[40px] p-8 pb-12 shadow-2xl">
            <View className="items-center mb-6">
              <View className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mb-6" />
              <Text className="text-2xl font-black text-black dark:text-white tracking-tight">Settle Obligations</Text>
              <Text className="text-gray-500 mt-1">Select wallet to record the transaction</Text>
            </View>

            <ScrollView className="max-h-[300px] mb-8" showsVerticalScrollIndicator={false}>
              {wallets.map((w) => (
                <TouchableOpacity
                  key={w.id}
                  onPress={() => setSettlingWalletId(w.id!)}
                  className={`flex-row justify-between items-center p-5 rounded-2xl mb-3 border-2 ${settlingWalletId === w.id ? 'bg-blue-50/50 dark:bg-blue-500/10 border-blue-500' : 'bg-gray-50 dark:bg-[#222] border-transparent'}`}
                >
                  <View className="flex-row items-center gap-4">
                    <View className={`w-12 h-12 rounded-full items-center justify-center ${settlingWalletId === w.id ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-800'}`}>
                      <Ionicons name="wallet-outline" size={24} color={settlingWalletId === w.id ? "#fff" : "#999"} />
                    </View>
                    <View>
                      <Text className={`text-base font-bold ${settlingWalletId === w.id ? 'text-blue-600 dark:text-blue-400' : 'text-black dark:text-white'}`}>{w.name}</Text>
                      <Text className="text-gray-400 text-xs">Current balance</Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-sm font-black text-black dark:text-white">Rp {w.balance.toLocaleString('id-ID')}</Text>
                    {settlingWalletId === w.id && <Ionicons name="checkmark-circle" size={20} color="#2563eb" />}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowSettleModal(false)}
                className="flex-1 bg-gray-100 dark:bg-gray-800 py-4.5 rounded-2xl items-center"
              >
                <Text className="text-gray-500 dark:text-gray-400 font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmSettlement}
                disabled={settling}
                className="flex-[2] bg-blue-600 py-4.5 rounded-2xl items-center shadow-lg shadow-blue-500/30"
              >
                {settling ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-black">CONFIRM SETTLEMENT</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
