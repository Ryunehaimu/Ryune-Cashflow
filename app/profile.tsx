import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebaseConfig';

export default function ProfileScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  
  // Mock data for billing
  const subscription = {
    plan: 'Premium Personal',
    status: 'Active',
    expiresAt: '20 April 2026',
    price: 'Rp 29.000 / bulan'
  };

  return (
    <SafeAreaView className="flex-1 bg-[#fafafa] dark:bg-[#0a0a0a]" style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
      {/* Header */}
      <View className="flex-row items-center px-6 py-4 border-b border-gray-100 dark:border-[#1c1c1e]">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="chevron-back" size={24} color="#000" className="dark:text-white" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-black dark:text-white ml-2">Profil & Billing</Text>
      </View>

      <ScrollView className="flex-1 px-6">
        {/* User Info */}
        <View className="items-center mt-8 mb-10">
          <View className="w-24 h-24 rounded-full bg-blue-600 items-center justify-center shadow-xl mb-4">
            <Text className="text-white font-black text-4xl">
              {(user?.displayName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
            </Text>
          </View>
          <Text className="text-2xl font-bold text-black dark:text-white">{user?.displayName || 'Pengguna Ryune'}</Text>
          <Text className="text-gray-500 dark:text-gray-400 mt-1">{user?.email}</Text>
        </View>

        {/* Subscription Card */}
        <View className="bg-white dark:bg-[#1c1c1e] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-[#2c2c2e] mb-6">
          <View className="flex-row justify-between items-start mb-6">
            <View>
              <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status Langganan</Text>
              <Text className="text-2xl font-black text-blue-600 dark:text-blue-400">{subscription.plan}</Text>
            </View>
            <View className="bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
              <Text className="text-green-600 dark:text-green-400 text-xs font-bold">{subscription.status}</Text>
            </View>
          </View>

          <View className="space-y-4">
            <View className="flex-row justify-between items-center py-3 border-b border-gray-50 dark:border-[#2c2c2e]">
              <Text className="text-gray-600 dark:text-gray-400">Aktif Sampai</Text>
              <Text className="font-bold text-black dark:text-white">{subscription.expiresAt}</Text>
            </View>
            <View className="flex-row justify-between items-center py-3">
              <Text className="text-gray-600 dark:text-gray-400">Harga Perpanjang</Text>
              <Text className="font-bold text-black dark:text-white">{subscription.price}</Text>
            </View>
          </View>

          <TouchableOpacity 
            className="bg-blue-600 py-4 rounded-2xl mt-6 items-center shadow-lg shadow-blue-500/30"
            activeOpacity={0.8}
            onPress={() => alert('Fitur perpanjang akan segera hadir!')}
          >
            <Text className="text-white font-black text-lg">Perpanjang Sekarang</Text>
          </TouchableOpacity>
        </View>

        {/* Billing Info */}
        <View className="mb-10">
          <Text className="text-lg font-bold text-black dark:text-white mb-4 px-1">Riwayat & Detail</Text>
          
          <View className="bg-white dark:bg-[#1c1c1e] rounded-3xl overflow-hidden border border-gray-100 dark:border-[#2c2c2e]">
            {[
              { label: 'Metode Pembayaran', value: 'Transfer Bank (BCA)', icon: 'card' },
              { label: 'Tagihan Terakhir', value: '20 Maret 2026', icon: 'receipt' },
              { label: 'ID Pelanggan', value: `RC-${user?.uid.slice(0, 8).toUpperCase()}`, icon: 'person' },
            ].map((item, index) => (
              <View key={index} className={`flex-row items-center p-5 ${index !== 2 ? 'border-b border-gray-50 dark:border-[#2c2c2e]' : ''}`}>
                <View className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-[#2c2c2e] items-center justify-center mr-4">
                  <Ionicons name={item.icon as any} size={20} color="#6366f1" />
                </View>
                <View>
                  <Text className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{item.label}</Text>
                  <Text className="text-base font-bold text-black dark:text-white">{item.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity 
          onPress={() => auth.signOut().then(() => router.replace('/login'))}
          className="flex-row items-center justify-center py-6 mb-10"
        >
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text className="text-red-500 font-bold ml-2">Keluar dari Akun</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
