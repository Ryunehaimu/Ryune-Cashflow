import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Wallet } from '../services/firestore';

interface WalletListProps {
  wallets: Wallet[];
  hideBalance: boolean;
}

export function WalletList({ wallets, hideBalance }: WalletListProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / 208); // w-48 (192) + mr-4 (16) = 208
    if (index !== activeIndex) {
      setActiveIndex(Math.min(index, wallets.length - 1));
    }
  };

  return (
    <View className="mb-8">
      <View className="flex-row justify-between items-end mb-4">
        <Text className="text-xl font-bold text-black dark:text-white tracking-tight">Smart View</Text>
      </View>
      {wallets.length === 0 ? (
        <View className="bg-white dark:bg-[#111] p-6 rounded-3xl items-center border border-gray-100 dark:border-[#222]">
          <Text className="text-gray-500">No wallets yet.</Text>
        </View>
      ) : (
        <View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            className="overflow-visible"
            snapToInterval={208}
            decelerationRate="fast"
            onMomentumScrollEnd={handleScroll}
            scrollEventThrottle={16}
          >
            {wallets.map((w, index) => {
              const colors = [
                "bg-indigo-500",
                "bg-rose-500",
                "bg-emerald-500",
                "bg-amber-500",
                "bg-slate-800"
              ];
              const cardColor = colors[index % colors.length];
              
              return (
                <Link key={w.id} href={`/wallet/${w.id}`} asChild>
                  <TouchableOpacity 
                    activeOpacity={0.9}
                    className={`${cardColor} p-6 rounded-[28px] w-48 mr-4 shadow-xl shadow-black/10 overflow-hidden`}
                  >
                    <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mb-6">
                      <Ionicons name="wallet" size={20} color="white" />
                    </View>
                    <Text className="text-white/80 font-medium mb-1">{w.name}</Text>
                    <Text className="text-white/90 text-sm font-bold tracking-tight mb-1">{w.currency}</Text>
                    <Text className="text-white text-xl font-bold tracking-tight" numberOfLines={1} adjustsFontSizeToFit>
                      {hideBalance ? 'Rp ••••••••' : `Rp ${w.balance.toLocaleString('id-ID')}`}
                    </Text>
                    <View className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10"></View>
                  </TouchableOpacity>
                </Link>
              );
            })}
          </ScrollView>

          {/* Pagination Container for Wallets */}
          {wallets.length > 1 && (
            <View className="flex-row justify-center items-center py-4 mt-2">
              {wallets.map((_, idx) => (
                <View 
                  key={`dot-${idx}`} 
                  className={`h-1.5 rounded-full mx-1 ${activeIndex === idx ? 'w-4 bg-blue-600' : 'w-1.5 bg-gray-300 dark:bg-gray-700'}`} 
                />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
