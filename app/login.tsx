import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();

  const handleAuth = async () => {
    if (!email || !password) {
      alert('Please fill email and password');
      return;
    }
    setLoading(true);
    try {
      await AsyncStorage.setItem('loginTimestamp', Date.now().toString());
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      // Observer in _layout will handle redirect
    } catch (error: any) {
      await AsyncStorage.removeItem('loginTimestamp');
      console.error(error);
      alert(error.message);
      setLoading(false); // only hide loading if there's an error, otherwise unmount happens
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#fafafa] dark:bg-[#0a0a0a]">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
      >
        <View className="flex-1 px-8 justify-center pb-20 mt-10" style={{ minHeight: height * 0.8 }}>
          
          {/* Logo / Icon */}
          <View className="w-16 h-16 bg-black dark:bg-white rounded-[20px] items-center justify-center mb-10 shadow-xl shadow-black/10">
            <Ionicons name="card" size={30} color={isLogin ? "white" : "black"} className="dark:color-black" />
          </View>

          {/* Typography */}
          <Text className="text-4xl font-black text-black dark:text-white tracking-tighter mb-2">
            {isLogin ? 'Welcome back' : 'Create account'}
          </Text>
          <Text className="text-gray-500 font-medium mb-10 text-base">
            {isLogin ? 'Enter your details to access your wallets.' : 'Sign up to start tracking your cash flow.'}
          </Text>

          {/* Form */}
          <View className="space-y-4">
            <TextInput
              placeholder="Email address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              className="bg-white dark:bg-[#111] text-black dark:text-white px-5 py-4 rounded-2xl mb-4 font-medium border border-gray-100 dark:border-[#222] shadow-sm text-base"
              placeholderTextColor="#9ca3af"
            />
            
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              className="bg-white dark:bg-[#111] text-black dark:text-white px-5 py-4 rounded-2xl mb-8 font-medium border border-gray-100 dark:border-[#222] shadow-sm text-base"
              placeholderTextColor="#9ca3af"
            />

            <TouchableOpacity 
              onPress={handleAuth}
              disabled={loading}
              className="bg-black dark:bg-white py-4 rounded-2xl items-center shadow-lg shadow-black/20"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white dark:text-black font-bold text-lg">
                  {isLogin ? 'Sign In' : 'Sign Up'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Toggle */}
          <View className="flex-row justify-center mt-10">
            <Text className="text-gray-500 font-medium text-base">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </Text>
            <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
              <Text className="text-black dark:text-white font-bold text-base">
                {isLogin ? 'Sign up' : 'Sign in'}
              </Text>
            </TouchableOpacity>
          </View>
          
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
