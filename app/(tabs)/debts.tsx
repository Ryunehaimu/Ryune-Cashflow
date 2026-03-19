import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, SafeAreaView, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../../firebaseConfig';
import { addDebt, addTransaction, Debt, deleteDebt, getDebts, getWallets, updateDebtStatus } from '../../services/firestore';

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

  useEffect(() => {
    loadDebts();
  }, []);

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
    try {
      await updateDebtStatus(debt.id!, !debt.isPaid);

      // Auto-record transaction if newly marked as PAID
      if (!debt.isPaid && auth.currentUser) {
        const userWallets = await getWallets(auth.currentUser.uid);
        if (userWallets.length > 0) {
          const defaultWallet = userWallets[0]; // Auto pick first wallet
          await addTransaction({
            userId: auth.currentUser.uid,
            walletId: defaultWallet.id!,
            amount: debt.amount,
            type: debt.type === 'given' ? 'income' : 'expense',
            category: 'Debt Settlement',
            description: `Settled: ${debt.person}${debt.description ? ` (${debt.description})` : ''}`
          }, defaultWallet.id!);
        }
      }

      loadDebts();
    } catch (e) {
      console.error(e);
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

        {/* Add Record Form */}
        <View className="bg-white dark:bg-[#111] p-6 rounded-[32px] shadow-sm mb-8 border border-gray-100 dark:border-[#222]">
          <Text className="text-base font-bold text-black dark:text-white mb-4">New Record</Text>

          <View className="flex-row bg-[#1c1c1e] rounded-2xl p-1 mb-6">
            <TouchableOpacity
              className={`flex-1 flex-row py-3 rounded-xl items-center justify-center gap-1.5 ${type === 'given' ? 'bg-[#1a0a0a]' : ''}`}
              onPress={() => setType('given')}
            >
              <Ionicons name="arrow-up-circle" size={16} color={type === 'given' ? '#ef4444' : '#666'} />
              <Text className={`font-bold text-sm ${type === 'given' ? 'text-[#ef4444]' : 'text-gray-400 dark:text-[#666]'}`}>I Lent</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 flex-row py-3 rounded-xl items-center justify-center gap-1.5 ${type === 'taken' ? 'bg-[#0a1a0f]' : ''}`}
              onPress={() => setType('taken')}
            >
              <Ionicons name="arrow-down-circle" size={16} color={type === 'taken' ? '#10b981' : '#666'} />
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
            className="bg-black dark:bg-white py-4 rounded-2xl items-center shadow-md shadow-black/20"
          >
            {adding ? <ActivityIndicator color="#fff" /> : <Text className="text-white dark:text-black font-bold text-base">Save Record</Text>}
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
              <Ionicons name="document-text-outline" size={40} color="#cbd5e1" />
              <Text className="text-gray-400 font-medium mt-4">Belum ada catatan utang/piutang.</Text>
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
    </SafeAreaView>
  );
}
