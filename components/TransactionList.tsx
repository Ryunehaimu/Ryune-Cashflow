import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction } from '../services/firestore';

interface TransactionListProps {
  transactions: Transaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(transactions.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = transactions.slice(startIndex, startIndex + itemsPerPage);

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1);
  };
  
  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  };

  return (
    <>
      <View className="flex-row justify-between items-end mb-4">
        <Text className="text-xl font-bold text-black dark:text-white tracking-tight">Latest Mutasi</Text>
      </View>

      <View className="bg-white dark:bg-[#111] rounded-[32px] p-2 mb-12 shadow-sm border border-gray-100 dark:border-[#222]">
        {transactions.length === 0 ? (
            <View className="p-8 items-center">
              <Ionicons name="receipt-outline" size={40} color="#cbd5e1" />
              <Text className="text-gray-500 font-medium mt-4">Belum ada mutasi untuk periode ini.</Text>
            </View>
        ) : (
          <View>
            {paginatedTransactions.map((t, i) => (
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
                    {t.type === 'income' ? '+' : '-'}Rp{t.amount.toLocaleString('id-ID')}
                  </Text>
                  <Text className="text-gray-400 text-xs mt-0.5">
                    {typeof t.date?.toDate === 'function' 
                      ? t.date.toDate().toLocaleDateString('id-ID') 
                      : t.date instanceof Date 
                        ? t.date.toLocaleDateString('id-ID') 
                        : 'Hari ini'}
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
    </>
  );
}
