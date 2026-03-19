import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth } from '../../firebaseConfig';
import { getWallets, addWallet, deleteWallet, Wallet } from '../../services/firestore';

export default function WalletsScreen() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const router = useRouter();
  const [currency, setCurrency] = useState('IDR');
  const [balance, setBalance] = useState('');
  const [adding, setAdding] = useState(false);

  const formatCurrency = (val: string) => {
    if (!val) return '';
    const numberString = val.replace(/[^0-9]/g, '');
    return numberString.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleBalanceChange = (text: string) => {
    setBalance(formatCurrency(text));
  };

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    if (!auth.currentUser) return;
    try {
      const data = await getWallets(auth.currentUser.uid);
      setWallets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWallet = async () => {
    if (!name || !balance) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    if (!auth.currentUser) return;

    setAdding(true);
    try {
      await addWallet({
        userId: auth.currentUser.uid,
        name,
        currency,
        balance: parseFloat(balance.replace(/\./g, '')),
      });
      setName('');
      setBalance('');
      loadWallets();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to add wallet');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Wallet', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteWallet(id);
          loadWallets();
        } catch (error) {
           console.error(error);
        }
      }}
    ]);
  };

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
      <View className="px-6 pt-6 pb-4">
        <Text className="text-3xl font-black text-black dark:text-white tracking-tighter">Your Wallets</Text>
        <Text className="text-gray-500 mt-1 font-medium">Manage your accounts and balances</Text>
      </View>

      <ScrollView className="flex-1 px-6 pb-12" showsVerticalScrollIndicator={false}>
        
        {/* Add Wallet Form - Floating Card */}
        <View className="bg-white dark:bg-[#111] p-6 rounded-[32px] shadow-sm mb-8 border border-gray-100 dark:border-[#222]">
          <Text className="text-base font-bold text-black dark:text-white mb-4">Create new Wallet</Text>
          
          <TextInput
            placeholder="Wallet Name (e.g. BCA, OVO)"
            value={name}
            onChangeText={setName}
            className="bg-[#f4f4f5] dark:bg-[#1a1a1a] border border-transparent dark:border-[#333] text-black dark:text-white px-5 py-4 rounded-2xl mb-3 font-medium text-base"
            placeholderTextColor="#9ca3af"
          />
          <View className="flex-row gap-3 mb-6">
            <TextInput
              placeholder="Currency (e.g. IDR)"
              value={currency}
              onChangeText={setCurrency}
              className="bg-[#f4f4f5] dark:bg-[#1a1a1a] border border-transparent dark:border-[#333] text-black dark:text-white px-5 py-4 rounded-2xl w-1/3 text-center font-bold"
              placeholderTextColor="#9ca3af"
            />
            <TextInput
              placeholder="Initial Balance"
              value={balance}
              onChangeText={handleBalanceChange}
              keyboardType="numeric"
              className="bg-[#f4f4f5] dark:bg-[#1a1a1a] border border-transparent dark:border-[#333] text-black dark:text-white px-5 py-4 rounded-2xl flex-1 font-medium text-base"
              placeholderTextColor="#9ca3af"
            />
          </View>
          
          <TouchableOpacity 
            onPress={handleAddWallet}
            disabled={adding}
            className="bg-black dark:bg-white py-4 rounded-2xl items-center shadow-md shadow-black/20"
          >
            {adding ? <ActivityIndicator color="#fff" /> : <Text className="text-white dark:text-black font-bold text-base">Add Wallet</Text>}
          </TouchableOpacity>
        </View>

        {/* Wallets List Section */}
        <Text className="text-xl font-bold text-black dark:text-white tracking-tight mb-4">Saved Accounts</Text>
        
        {wallets.length === 0 ? (
          <View className="items-center py-10">
            <Ionicons name="wallet-outline" size={48} color="#cbd5e1" />
            <Text className="text-gray-400 mt-4 font-medium">No wallets available.</Text>
          </View>
        ) : (
          wallets.map((item, index) => {
            const colors = [
              "bg-[#6366f1]",
              "bg-[#f43f5e]",
              "bg-[#10b981]",
              "bg-[#3b82f6]"
            ];
            const bgClass = colors[index % colors.length];

            return (
              <TouchableOpacity 
                key={item.id} 
                activeOpacity={0.9}
                onPress={() => router.push(`/wallet/${item.id}` as any)}
                className={`${bgClass} rounded-[28px] p-6 mb-4 shadow-xl shadow-black/10 overflow-hidden`}
              >
                <View className="flex-row justify-between items-start mb-6">
                  <View className="bg-white/20 px-3 py-1.5 rounded-full flex-row items-center">
                    <Ionicons name="wallet" size={14} color="white" />
                    <Text className="text-white font-bold text-xs ml-1.5 tracking-wider">{item.currency}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(item.id!)} className="p-2 -mr-2 -mt-2 bg-black/10 rounded-full">
                    <Ionicons name="trash-outline" size={18} color="white" />
                  </TouchableOpacity>
                </View>
                
                <Text className="text-lg font-bold text-white mb-1">{item.name}</Text>
                <Text className="text-3xl font-black text-white tracking-tight">
                  Rp {item.balance.toLocaleString('id-ID')}
                </Text>
                
                <View className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/10"></View>
                <View className="absolute -left-12 -top-12 w-24 h-24 rounded-full bg-black/10"></View>
              </TouchableOpacity>
            );
          })
        )}
        <View className="h-12" />
      </ScrollView>
    </SafeAreaView>
  );
}
