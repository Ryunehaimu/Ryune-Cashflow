import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../firebaseConfig';
import { getWalletById, getTransactionsByWallet, Wallet, Transaction } from '../../services/firestore';
import { MonthYearPicker } from '../../components/MonthYearPicker';

export default function WalletDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Analysis & Filter state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [hideBalance, setHideBalance] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const toggleHideBalance = () => {
    setHideBalance(val => !val);
  };

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (walletId: string) => {
    if (!auth.currentUser) return;
    try {
      const w = await getWalletById(walletId);
      const t = await getTransactionsByWallet(auth.currentUser.uid, walletId);
      setWallet(w);
      setTransactions(t);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Filter Transactions by month
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t: Transaction) => {
      const tDate = typeof t.date?.toDate === 'function' ? t.date.toDate() : (t.date instanceof Date ? t.date : new Date(t.date || Date.now()));
      return tDate.getMonth() === selectedDate.getMonth() && tDate.getFullYear() === selectedDate.getFullYear();
    });
  }, [transactions, selectedDate]);

  // Total Expense & Category Data
  const analysis = useMemo(() => {
    const expenses = filteredTransactions.filter((t: Transaction) => t.type === 'expense');
    const totalExp = expenses.reduce((acc: number, t: Transaction) => acc + t.amount, 0);
    
    const groups: { [cat: string]: number } = {};
    expenses.forEach((t: Transaction) => {
      groups[t.category] = (groups[t.category] || 0) + t.amount;
    });

    const categories = Object.entries(groups)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalExp > 0 ? (amount / totalExp) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    return { totalExp, categories };
  }, [filteredTransactions]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  const handleNext = () => { if (currentPage < totalPages) setCurrentPage(p => p + 1); };
  const handlePrev = () => { if (currentPage > 1) setCurrentPage(p => p - 1); };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#fafafa] dark:bg-[#0a0a0a]">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!wallet) {
    return (
      <View className="flex-1 justify-center items-center bg-[#fafafa] dark:bg-[#0a0a0a]">
        <Text className="text-black dark:text-white font-bold text-lg">Wallet not found.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 px-6 py-3 bg-black dark:bg-white rounded-full">
          <Text className="text-white dark:text-black font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#fafafa] dark:bg-[#0a0a0a]" style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
      {/* Header */}
      <View className="px-6 pt-6 pb-4 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-gray-200 dark:bg-[#222] rounded-full justify-center items-center mr-4">
          <Ionicons name="arrow-back" size={24} color="#666" />
        </TouchableOpacity>
        <View>
          <Text className="text-2xl font-black text-black dark:text-white tracking-tighter">{wallet.name}</Text>
          <TouchableOpacity onPress={() => setShowPicker(true)} className="flex-row items-center mt-1">
            <Text className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">
              {selectedDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </Text>
            <Ionicons name="chevron-down" size={12} color="#666" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        className="flex-1 px-6 pt-4" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
      >
        {/* Wallet Balance Card */}
        <View className="bg-indigo-500 p-8 rounded-[32px] mb-8 shadow-xl shadow-black/10 overflow-hidden items-center justify-center">
          <Text className="text-white/80 font-medium mb-2 uppercase tracking-widest text-xs">Current Balance</Text>
          <View className="flex-row items-center justify-center">
            <Text className="text-white text-4xl font-black tracking-tighter mb-1">
              {hideBalance ? 'Rp •••••••' : `Rp ${wallet.balance.toLocaleString('id-ID')}`}
            </Text>
            <TouchableOpacity 
              onPress={toggleHideBalance}
              activeOpacity={0.6}
              className="w-10 h-10 rounded-full bg-white/30 items-center justify-center ml-4"
              style={{ zIndex: 50 }}
            >
              <Ionicons name={hideBalance ? "eye-off" : "eye"} size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <View className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/10"></View>
          <View className="absolute -left-12 -top-12 w-24 h-24 rounded-full bg-black/10"></View>
        </View>

        {/* Monthly Analysis Summary */}
        <View className="flex-row gap-4 mb-8">
          <View className="flex-1 bg-white dark:bg-[#111] p-5 rounded-[28px] border border-gray-100 dark:border-[#222] shadow-sm">
            <View className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-500/10 items-center justify-center mb-3">
              <Ionicons name="arrow-up" size={14} color="#ef4444" />
            </View>
            <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Total Pengeluaran</Text>
            <Text className="text-black dark:text-white font-black text-lg tracking-tight">
               {hideBalance ? 'Rp •••••••' : `Rp ${analysis.totalExp.toLocaleString('id-ID')}`}
            </Text>
          </View>
          
          <View className="flex-[1.2] bg-white dark:bg-[#111] p-5 rounded-[28px] border border-gray-100 dark:border-[#222] shadow-sm">
             <View className="flex-row justify-between items-center mb-3">
                <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Top Category</Text>
                <Ionicons name="pie-chart" size={14} color="#10b981" />
             </View>
             {analysis.categories.length > 0 ? (
               <View>
                 <Text className="text-black dark:text-white font-black text-lg tracking-tight mb-1" numberOfLines={1}>{analysis.categories[0].name}</Text>
                 <View className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <View style={{ width: `${analysis.categories[0].percentage}%` }} className="h-full bg-emerald-500 rounded-full" />
                 </View>
               </View>
             ) : (
               <Text className="text-gray-400 text-xs mt-2 italic">Belum ada data</Text>
             )}
          </View>
        </View>

        {/* Category breakdown chart/list if exists */}
        {analysis.categories.length > 0 && (
          <View className="bg-white dark:bg-[#111] rounded-[32px] p-6 mb-8 shadow-sm border border-gray-100 dark:border-[#222]">
            <Text className="text-base font-bold text-black dark:text-white mb-4">Breakdown Kategori</Text>
            {analysis.categories.slice(0, 5).map((cat: { name: string, amount: number, percentage: number }, idx: number) => (
              <View key={cat.name} className="mb-4">
                <View className="flex-row justify-between items-center mb-1.5">
                  <Text className="text-black dark:text-gray-300 font-bold text-xs">{cat.name}</Text>
                  <Text className="text-black dark:text-white font-black text-xs">
                    {hideBalance ? 'Rp •••••••' : `Rp ${cat.amount.toLocaleString('id-ID')}`}
                  </Text>
                </View>
                <View className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <View style={{ width: `${cat.percentage}%` }} className={`h-full rounded-full ${idx === 0 ? 'bg-emerald-500' : idx === 1 ? 'bg-amber-500' : 'bg-blue-500'}`} />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Transactions / Mutations */}
        <Text className="text-xl font-bold text-black dark:text-white tracking-tight mb-4">Mutasi ({filteredTransactions.length})</Text>
        
        <View className="bg-white dark:bg-[#111] rounded-[32px] p-2 mb-12 shadow-sm border border-gray-100 dark:border-[#222]">
          {transactions.length === 0 ? (
             <View className="p-8 items-center">
               <Ionicons name="receipt-outline" size={40} color="#cbd5e1" />
               <Text className="text-gray-500 font-medium mt-4">Belum ada mutasi di dompet ini.</Text>
             </View>
          ) : (
            <View>
              {paginatedTransactions.map((t: Transaction, i: number) => (
                <View key={t.id} className={`flex-row items-center py-4 px-4 ${Math.floor(i) !== paginatedTransactions.length - 1 ? 'border-b border-gray-100 dark:border-gray-800/60' : ''}`}>
                  <View className={`w-12 h-12 rounded-full items-center justify-center ${t.type === 'income' ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-rose-100 dark:bg-rose-500/20'}`}>
                    <Ionicons name={t.type === 'income' ? 'arrow-down' : 'arrow-up'} size={20} color={t.type === 'income' ? '#10b981' : '#ef4444'} />
                  </View>
                  <View className="flex-1 ml-4 justify-center">
                    <Text className="text-black dark:text-white font-bold text-base">{t.category}</Text>
                    <Text className="text-gray-400 text-sm mt-0.5" numberOfLines={1}>{t.description || 'Tidak ada catatan'}</Text>
                  </View>
                  <View className="items-end">
                    <Text className={`font-black text-base ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {t.type === 'income' ? '+' : '-'}
                      {hideBalance ? 'Rp •••••••' : `Rp${t.amount.toLocaleString('id-ID')}`}
                    </Text>
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

      <MonthYearPicker
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={(date) => {
          setSelectedDate(date);
          setCurrentPage(1); // Reset pagination on filter change
        }}
        selectedDate={selectedDate}
      />
    </SafeAreaView>
  );
}
