import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Calendar } from 'lucide-react-native';
import { auth } from '../../firebaseConfig';
import { getWallets, getTransactions, Wallet, Transaction } from '../../services/firestore';
import { MonthYearPicker } from '../../components/MonthYearPicker';
import { SummaryCard } from '../../components/SummaryCard';
import { WalletList } from '../../components/WalletList';
import { TransactionList } from '../../components/TransactionList';

export default function DashboardScreen() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [hideBalance, setHideBalance] = useState(true);
  
  // Custom Month Filter State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isPickerVisible, setIsPickerVisible] = useState(false);


  const loadData = async () => {
    if (!auth.currentUser) return;
    try {
      const w = await getWallets(auth.currentUser.uid);
      const t = await getTransactions(auth.currentUser.uid);
      setWallets(w);
      setAllTransactions(t);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const targetMonth = selectedDate.getMonth();
    const targetYear = selectedDate.getFullYear();
    
    const filtered = allTransactions.filter(t => {
      const d = typeof t.date?.toDate === 'function' ? t.date.toDate() : (t.date instanceof Date ? t.date : new Date(t.date || Date.now()));
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });
    
    setFilteredTransactions(filtered.slice(0, 50));
  }, [allTransactions, selectedDate]);

  const currentTotalBalance = wallets.reduce((acc, w) => acc + w.balance, 0);

  // Calculate historical balance as of the selected month
  const endOfSelectedMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999);
  const now = new Date();
  let displayBalance = currentTotalBalance;

  // Only reverse-calculate if the selected month is completely in the past
  if (selectedDate.getFullYear() < now.getFullYear() || (selectedDate.getFullYear() === now.getFullYear() && selectedDate.getMonth() < now.getMonth())) {
    const transactionsAfterSelectedMonth = allTransactions.filter(t => {
      const d = typeof t.date?.toDate === 'function' ? t.date.toDate() : (t.date instanceof Date ? t.date : new Date(t.date || Date.now()));
      return d > endOfSelectedMonth;
    });

    const netCashflowAfter = transactionsAfterSelectedMonth.reduce((acc, t) => {
      return acc + (t.type === 'income' ? t.amount : -t.amount);
    }, 0);

    displayBalance = currentTotalBalance - netCashflowAfter;
  }

  const periodIncome = filteredTransactions.filter((t) => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const periodExpense = filteredTransactions.filter((t) => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const netCashflow = periodIncome - periodExpense;

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#fafafa] dark:bg-[#0a0a0a]">
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#fafafa] dark:bg-[#0a0a0a]" style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
      <ScrollView 
        className="flex-1 px-6 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#000" />}
      >

        <View className="flex-row justify-between items-center mb-6 px-1">
          <Text className="text-xl font-bold text-black dark:text-white tracking-tight">Ringkasan Bulan</Text>
          <TouchableOpacity 
            onPress={() => setIsPickerVisible(true)}
            className="bg-white dark:bg-[#222] px-4 py-2 rounded-xl flex-row items-center shadow-sm border border-gray-100 dark:border-[#333]"
          >
            <Calendar color={Platform.OS === 'ios' ? '#007AFF' : '#2563eb'} size={16} />
            <Text className="text-sm font-bold text-gray-800 dark:text-gray-200 ml-2">
              {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][selectedDate.getMonth()]} {selectedDate.getFullYear()}
            </Text>
          </TouchableOpacity>
        </View>

        <MonthYearPicker 
          visible={isPickerVisible} 
          onClose={() => setIsPickerVisible(false)} 
          onSelect={setSelectedDate} 
          selectedDate={selectedDate} 
        />

        <SummaryCard 
          showChart={showChart}
          setShowChart={setShowChart}
          hideBalance={hideBalance}
          setHideBalance={setHideBalance}
          totalBalance={displayBalance}
          netCashflow={netCashflow}
          periodIncome={periodIncome}
          periodExpense={periodExpense}
          selectedDate={selectedDate}
          allTransactions={allTransactions}
        />

        <WalletList 
          wallets={wallets} 
          hideBalance={hideBalance} 
        />

        <TransactionList 
          transactions={filteredTransactions} 
        />
      </ScrollView>


    </SafeAreaView>
  );
}
