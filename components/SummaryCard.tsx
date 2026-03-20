import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React, { useState, useMemo } from 'react';
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { auth } from '../firebaseConfig';
import { Transaction } from '../services/firestore';

interface SummaryCardProps {
  showChart: boolean;
  setShowChart: (show: boolean) => void;
  hideBalance: boolean;
  setHideBalance: (hide: boolean) => void;
  totalBalance: number;
  netCashflow: number;
  periodIncome: number;
  periodExpense: number;
  selectedDate: Date;
  allTransactions: Transaction[];
}

export function SummaryCard({
  hideBalance,
  setHideBalance,
  totalBalance,
  netCashflow,
  periodIncome,
  periodExpense,
  selectedDate,
  allTransactions
}: SummaryCardProps) {
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
  const currentMonthName = monthNames[selectedDate.getMonth()];

  const [activeIndex, setActiveIndex] = useState(0);
  const [activeChartMonth, setActiveChartMonth] = useState<string | null>(null);
  const slideWidth = Dimensions.get('window').width - 48; // Menyesuaikan padding horizontal (px-6) dari index.tsx

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / slideWidth);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  // Generate 5 months surrounding the selected Date (2 before, current, 2 after)
  const chartData = useMemo(() => {
    const data = [];
    const baseYear = selectedDate.getFullYear();
    const baseMonth = selectedDate.getMonth();

    for (let i = -2; i <= 2; i++) {
      const d = new Date(baseYear, baseMonth + i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      
      const monthTransactions = allTransactions.filter(t => {
        const tDate = typeof t.date?.toDate === 'function' ? t.date.toDate() : (t.date instanceof Date ? t.date : new Date(t.date || Date.now()));
        return tDate.getMonth() === m && tDate.getFullYear() === y;
      });

      const income = monthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expense = monthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

      data.push({
        id: `${y}-${m}`,
        monthIndex: m,
        name: monthNames[m],
        income,
        expense,
        total: Math.max(income, expense, 1) // prevent zero division
      });
    }

    // Find absolute max for normalizing bar heights securely
    const globalMax = Math.max(...data.map(d => d.total));
    
    return data.map(d => ({
      ...d,
      incomeHeightPercentage: Math.max(10, (d.income / globalMax) * 100),
      expenseHeightPercentage: Math.max(10, (d.expense / globalMax) * 100)
    }));
  }, [selectedDate, allTransactions]);

  // CATEGORY BREAKDOWN DATA (For Slide 3)
  const categoryData = useMemo(() => {
    const month = selectedDate.getMonth();
    const year = selectedDate.getFullYear();
    
    // Filter expenses for current month
    const expenses = allTransactions.filter(t => {
      const tDate = typeof t.date?.toDate === 'function' ? t.date.toDate() : (t.date instanceof Date ? t.date : new Date(t.date || Date.now()));
      return tDate.getMonth() === month && tDate.getFullYear() === year && t.type === 'expense';
    });

    const groups: { [cat: string]: number } = {};
    expenses.forEach(t => {
      groups[t.category] = (groups[t.category] || 0) + t.amount;
    });

    const sorted = Object.entries(groups)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    const total = sorted.reduce((acc, c) => acc + c.amount, 0);
    
    return sorted.map(c => ({
      ...c,
      percentage: total > 0 ? (c.amount / total) * 100 : 0
    }));
  }, [selectedDate, allTransactions]);

  // Determine which month tooltip to show (default: currently selected date's month)
  const expandedMonthId = activeChartMonth || `${selectedDate.getFullYear()}-${selectedDate.getMonth()}`;

  return (
    <View className="bg-white dark:bg-[#111] rounded-[40px] mb-8 shadow-xl shadow-black/5 border border-transparent dark:border-[#222] overflow-hidden">

      {/* Swipeable Container */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        decelerationRate="fast"
        snapToInterval={slideWidth}
      >
        {/* SLIDE 1: Balance */}
        <View style={{ width: slideWidth }} className="p-6 pb-2">
          {/* Top Row */}
          <View className="flex-row items-center mb-6">
            <View className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 items-center justify-center mr-3">
              <Ionicons name="wallet" size={20} color="#2563eb" />
            </View>
            <Text className="text-xl font-bold text-black dark:text-white tracking-tighter">
              My balance
            </Text>
          </View>

          {/* Balance Amount */}
          <View className="flex-row items-center mb-5">
            <Text className="text-[46px] font-black text-black dark:text-white tracking-tighter" numberOfLines={1} adjustsFontSizeToFit>
              {hideBalance ? 'Rp ••••••••' : `Rp ${totalBalance.toLocaleString('id-ID')}`}
            </Text>
            <TouchableOpacity onPress={() => setHideBalance(!hideBalance)} className="w-8 h-8 rounded-full bg-gray-50 dark:bg-[#222] items-center justify-center ml-3 shadow-sm">
              <Ionicons name={hideBalance ? "eye-off-outline" : "eye-outline"} size={16} color="#bbb" />
            </TouchableOpacity>
          </View>

          {/* Progress Indication */}
          <View className="flex-row items-center mb-6">
            <View className={`w-5 h-5 rounded-full ${netCashflow >= 0 ? 'bg-emerald-500' : 'bg-rose-500'} items-center justify-center mr-2`}>
              <Ionicons name={netCashflow >= 0 ? "arrow-up" : "arrow-down"} size={12} color="#fff" />
            </View>
            <Text className={`${netCashflow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'} font-bold text-sm tracking-tight`}>
              Net: {netCashflow >= 0 ? '+' : '-'}Rp {Math.abs(netCashflow).toLocaleString('id-ID')} <Text className="text-black dark:text-gray-400 font-medium">for selected period.</Text>
            </Text>
          </View>

          {/* Income & Expense Breakdown */}
          <View className="flex-row items-center justify-between pt-5 border-t border-gray-100 dark:border-gray-800/60">
            <View className="flex-1 flex-row items-center pr-2">
              <View className="w-10 h-10 rounded-full bg-[#ccff00]/10 dark:bg-[#ccff00]/5 items-center justify-center mr-3 border border-[#ccff00]/20">
                <Ionicons name="arrow-down" size={16} color="#9acd32" />
              </View>
              <View>
                <Text className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-0.5">Pendapatan</Text>
                <Text className="text-black dark:text-white font-black text-[15px] tracking-tight">
                  {hideBalance ? 'Rp •••••••' : `Rp ${periodIncome.toLocaleString('id-ID')}`}
                </Text>
              </View>
            </View>
            
            <View className="w-[1px] h-10 bg-gray-100 dark:bg-gray-800 mx-2" />
            
            <View className="flex-1 flex-row items-center pl-2">
              <View className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-500/10 items-center justify-center mr-3 border border-rose-100 dark:border-rose-500/20">
                <Ionicons name="arrow-up" size={16} color="#ef4444" />
              </View>
              <View>
                <Text className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-0.5">Pengeluaran</Text>
                <Text className="text-black dark:text-white font-black text-[15px] tracking-tight">
                  {hideBalance ? 'Rp •••••••' : `Rp ${periodExpense.toLocaleString('id-ID')}`}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* SLIDE 2: Cashflow Chart */}
        <View style={{ width: slideWidth }} className="p-6 pb-2">
          <View className="flex-row items-center mb-4">
            <View className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 items-center justify-center mr-3">
              <Ionicons name="stats-chart" size={20} color="#2563eb" />
            </View>
            <Text className="text-xl font-bold text-black dark:text-white tracking-tighter">
              Cashflow chart
            </Text>
          </View>
          
          {/* Authentic Data Chart UI */}
          <View className="h-[180px] flex-row items-end justify-between px-2 pt-16 border-b border-dashed border-gray-200 dark:border-gray-700 relative">
            <View className="absolute top-6 left-0 right-0 border-t border-dotted border-gray-200 dark:border-gray-800"></View>
            <Text className="absolute top-2 left-2 text-[10px] text-gray-400 font-bold tracking-wider">Amount (IDR)</Text>

            {chartData.map((data, idx) => {
              const isActive = expandedMonthId === data.id;

              return (
                <TouchableOpacity 
                  key={data.id}
                  onPress={() => setActiveChartMonth(isActive ? null : data.id)}
                  activeOpacity={0.8}
                  className="items-center w-12 relative h-full justify-end"
                >
                  <View 
                    style={{ height: `${data.expenseHeightPercentage}%` }} 
                    className={`w-8 rounded-t-xl absolute bottom-0 z-0 ${isActive ? 'bg-[#9acd32] shadow-md' : 'bg-gray-200 dark:bg-[#333]'}`} 
                  />
                  <View 
                    style={{ height: `${data.incomeHeightPercentage}%` }} 
                    className={`w-full rounded-b-xl z-10 ${isActive ? 'bg-blue-600 shadow-sm' : 'bg-gray-100 dark:bg-[#222]'}`} 
                  />
                  {isActive && <View className="absolute top-0 w-3.5 h-3.5 bg-blue-600 rounded-full border-[3px] border-white dark:border-[#111] z-20" />}
                  
                  {/* Smart Tooltip for Active Bar */}
                  {isActive && (
                    <View className={`absolute ${idx >= 3 ? '-right-2' : '-left-12'} -top-12 bg-[#222] rounded-2xl p-3 w-40 z-[9999] shadow-2xl opacity-95`}>
                      <View className="bg-white rounded-full px-2 py-0.5 mb-2 self-start">
                        <Text className="text-[9px] font-black uppercase text-black">{data.name} STATS</Text>
                      </View>
                      <View className="flex-row justify-between mb-1">
                        <View className="flex-row items-center">
                          <View className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
                          <Text className="text-gray-400 text-[10px] font-medium">Income</Text>
                        </View>
                        <Text className="text-emerald-400 font-bold text-[10px]">Rp {(data.income).toLocaleString('id-ID')}</Text>
                      </View>
                      <View className="flex-row justify-between">
                        <View className="flex-row items-center">
                          <View className="w-2 h-2 rounded-full bg-[#9acd32] mr-2" />
                          <Text className="text-gray-400 text-[10px] font-medium">Expense</Text>
                        </View>
                        <Text className="text-rose-400 font-bold text-[10px]">Rp {(data.expense).toLocaleString('id-ID')}</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View className="flex-row justify-between px-2 mt-4 mb-2">
            {chartData.map((data) => (
              <Text key={`label-${data.id}`} className={`text-[10px] font-bold ${expandedMonthId === data.id ? 'text-blue-600 dark:text-blue-400 text-xs' : 'text-gray-400 font-medium'}`}>
                {data.name}
              </Text>
            ))}
          </View>
        </View>

        {/* SLIDE 3: Category Breakdown */}
        <View style={{ width: slideWidth }} className="p-6 pb-2">
          <View className="flex-row items-center mb-4">
            <View className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 items-center justify-center mr-3">
              <Ionicons name="pie-chart" size={20} color="#10b981" />
            </View>
            <View>
              <Text className="text-xl font-bold text-black dark:text-white tracking-tighter">
                Expense by Category
              </Text>
              <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{currentMonthName} BREAKDOWN</Text>
            </View>
          </View>

          <View className="h-[180px]">
            {categoryData.length === 0 ? (
              <View className="flex-1 items-center justify-center">
                 <Ionicons name="receipt-outline" size={32} color="#cbd5e1" />
                 <Text className="text-gray-400 font-medium text-xs mt-2">No expenses this month</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {categoryData.slice(0, 5).map((cat, idx) => (
                  <View key={cat.name} className="mb-4">
                    <View className="flex-row justify-between items-center mb-1.5">
                      <View className="flex-row items-center">
                        <View className={`w-2 h-2 rounded-full mr-2 ${idx === 0 ? 'bg-blue-500' : idx === 1 ? 'bg-emerald-500' : idx === 2 ? 'bg-amber-500' : 'bg-gray-400'}`} />
                        <Text className="text-black dark:text-gray-300 font-bold text-xs">{cat.name}</Text>
                      </View>
                      <Text className="text-black dark:text-white font-black text-xs">Rp {cat.amount.toLocaleString('id-ID')}</Text>
                    </View>
                    <View className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <View 
                        style={{ width: `${cat.percentage}%` }} 
                        className={`h-full rounded-full ${idx === 0 ? 'bg-blue-500' : idx === 1 ? 'bg-emerald-500' : idx === 2 ? 'bg-amber-500' : 'bg-gray-400'}`}
                      />
                    </View>
                  </View>
                ))}
                {categoryData.length > 5 && (
                  <Text className="text-[10px] text-gray-400 text-center italic mt-1">+ {categoryData.length - 5} more categories</Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Pagination Container */}
      <View className="flex-row justify-center items-center py-4 bg-white dark:bg-[#111]">
        <View className={`h-1.5 rounded-full mx-1 ${activeIndex === 0 ? 'w-4 bg-blue-600' : 'w-1.5 bg-gray-300 dark:bg-gray-700'}`} />
        <View className={`h-1.5 rounded-full mx-1 ${activeIndex === 1 ? 'w-4 bg-blue-600' : 'w-1.5 bg-gray-300 dark:bg-gray-700'}`} />
        <View className={`h-1.5 rounded-full mx-1 ${activeIndex === 2 ? 'w-4 bg-blue-600' : 'w-1.5 bg-gray-300 dark:bg-gray-700'}`} />
      </View>

      {/* Action Buttons Footer */}
      <View className="flex-row gap-3 px-6 pb-6 pt-2">
        <Link href="/(tabs)/add" asChild>
          <TouchableOpacity className="flex-1 bg-blue-600 py-4 rounded-2xl flex-row justify-center items-center shadow-md shadow-blue-500/20">
            <Ionicons name="add" size={20} color="#fff" />
            <Text className="text-white font-bold text-base ml-2">Add Money</Text>
          </TouchableOpacity>
        </Link>
        <TouchableOpacity
          onPress={() => auth.signOut()}
          className="flex-1 bg-gray-100 dark:bg-[#222] py-4 rounded-2xl flex-row justify-center items-center shadow-sm"
        >
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text className="text-red-500 font-bold text-base ml-2">Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
