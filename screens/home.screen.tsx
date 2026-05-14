import {
  Alert,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  TextInput,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { scale, verticalScale } from "react-native-size-matters";
import AntDesign from "@expo/vector-icons/AntDesign";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Audio } from "expo-av";
import axios from "axios";
import LottieView from "lottie-react-native";
import * as Speech from "expo-speech";
import Regenerate from "@/assets/svgs/regenerate";
import Reload from "@/assets/svgs/reload";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/constants/Colors";

// Get API key from environment - fallback to empty if not set
const getApiKey = () => {
  // Try multiple ways to get the API key
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
  return apiKey;
};

export default function HomeScreen() {
  const { logout, user } = useAuth();
  const [text, setText] = useState("");
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [AIResponse, setAIResponse] = useState(false);
  const [AISpeaking, setAISpeaking] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const lottieRef = useRef<LottieView>(null);

  const getMicrophonePermission = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert("Permission", "Please grant permission to access microphone");
        return false;
      }
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  };

  const recordingOptions: any = {
    android: {
      extension: ".wav",
      outPutFormat: Audio.AndroidOutputFormat.MPEG_4,
      androidEncoder: Audio.AndroidAudioEncoder.AAC,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
    },
    ios: {
      extension: ".wav",
      audioQuality: Audio.IOSAudioQuality.HIGH,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
  };

  const startRecording = async () => {
    // Web platform - show input field instead
    if (Platform.OS === "web") {
      setShowInput(true);
      return;
    }

    const hasPermission = await getMicrophonePermission();
    if (!hasPermission) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      setIsRecording(true);
      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      setRecording(recording);
    } catch (error) {
      console.log("Failed to start Recording", error);
      setIsRecording(false);
      setRecording(null);
      Alert.alert("Error", "Failed to start recording. Please try again.");
    }
  };

  const stopRecording = async () => {
    if (!recording) {
      console.log("No recording to stop");
      setIsRecording(false);
      return;
    }

    try {
      setIsRecording(false);
      setLoading(true);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      setRecording(null);

      if (uri) {
        const transcript = await sendAudioToWhisper(uri);
        setText(transcript);
        await sendToGpt(transcript);
      }
    } catch (error) {
      console.log("Failed to stop Recording", error);
      setIsRecording(false);
      setRecording(null);
      Alert.alert("Error", "Failed to process recording");
    }
  };

  const sendAudioToWhisper = async (uri: string) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      return "API key not configured. Please add your OpenAI API key in the .env file.";
    }

    try {
      const formData = new FormData();
      formData.append("file", {
        uri,
        type: "audio/wav",
        name: "recording.wav",
      } as any);
      formData.append("model", "whisper-1");

      const response = await axios.post(
        "https://api.openai.com/v1/audio/transcriptions",
        formData,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data.text;
    } catch (error: any) {
      console.log("Whisper error:", error.response?.data || error.message);
      return "Could not transcribe audio. Please try again.";
    }
  };

  const sendToGpt = async (inputText: string) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setText("API key not configured. Please add your OpenAI API key in the .env file.");
      setLoading(false);
      setAIResponse(true);
      return;
    }

    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content:
                "You are Nova, a friendly AI assistant. You are helpful, concise, and respond naturally. Provide clear and helpful answers.",
            },
            {
              role: "user",
              content: inputText,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      const gptResponse = response.data.choices[0].message.content;
      setText(gptResponse);
      setLoading(false);
      setAIResponse(true);
      await speakText(gptResponse);
    } catch (error: any) {
      console.log("GPT error:", error.response?.data || error.message);
      setLoading(false);
      setAIResponse(true);
      if (error.response?.status === 401) {
        setText("Invalid API key. Please check your OpenAI API key in the .env file.");
      } else {
        setText("I'm having trouble connecting to the AI service. Please check your internet connection and try again.");
      }
    }
  };

  const handleSubmitText = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setText(inputText);
    await sendToGpt(inputText);
  };

  const speakText = async (textToSpeak: string) => {
    setAISpeaking(true);
    const options = {
      voice: "com.apple.ttsbundle.Samantha-compact",
      language: "en-US",
      pitch: 1.5,
      rate: 1,
      onDone: () => {
        setAISpeaking(false);
      },
    };
    Speech.speak(textToSpeak, options);
  };

  useEffect(() => {
    if (AISpeaking) {
      lottieRef.current?.play();
    } else {
      lottieRef.current?.reset();
    }
  }, [AISpeaking]);

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await logout();
      }},
    ]);
  };

  return (
    <LinearGradient
      colors={["#250152", "#000"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle={"light-content"} />

      <Image
        source={require("../assets/main/blur.png")}
        style={{
          position: "absolute",
          right: scale(-15),
          top: 0,
          width: scale(240),
        }}
      />
      <Image
        source={require("../assets/main/purple-blur.png")}
        style={{
          position: "absolute",
          left: scale(-15),
          bottom: verticalScale(100),
          width: scale(210),
        }}
      />

      {/* User Info Header */}
      <View style={styles.userHeader}>
        {AIResponse && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setIsRecording(false);
              setAIResponse(false);
              setText("");
              setShowInput(false);
            }}
          >
            <AntDesign name="arrowleft" size={scale(20)} color="#fff" />
          </TouchableOpacity>
        )}

        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <FontAwesome name="user" size={scale(18)} color="#fff" />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userGreeting}>Hello!</Text>
            <Text style={styles.userEmail}>{user?.email || 'User'}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <AntDesign name="logout" size={scale(20)} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: verticalScale(20) }}>
        {loading ? (
          <TouchableOpacity>
            <LottieView
              source={require("../assets/animations/loading.json")}
              autoPlay
              loop
              speed={1.3}
              style={{ width: scale(270), height: scale(270) }}
            />
          </TouchableOpacity>
        ) : (
          <>
            {!isRecording && !showInput ? (
              <>
                {AIResponse ? (
                  <View>
                    <LottieView
                      ref={lottieRef}
                      source={require("../assets/animations/ai-speaking.json")}
                      autoPlay={false}
                      loop={false}
                      style={{ width: scale(250), height: scale(250) }}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={{
                      width: scale(110),
                      height: scale(110),
                      backgroundColor: "#fff",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: scale(100),
                    }}
                    onPress={startRecording}
                  >
                    <FontAwesome
                      name="microphone"
                      size={scale(50)}
                      color="#2b3356"
                    />
                  </TouchableOpacity>
                )}
              </>
            ) : isRecording ? (
              <TouchableOpacity onPress={stopRecording}>
                <LottieView
                  source={require("../assets/animations/animation.json")}
                  autoPlay
                  loop
                  speed={1.3}
                  style={{ width: scale(250), height: scale(250) }}
                />
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </View>

      {/* Text Input for Web */}
      {showInput && !AIResponse && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type your message..."
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSubmitText}
          >
            <FontAwesome name="send" size={scale(18)} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Status Text */}
      <View
        style={{
          alignItems: "center",
          width: scale(350),
          position: "absolute",
          bottom: verticalScale(90),
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: scale(16),
            width: scale(269),
            textAlign: "center",
            lineHeight: 25,
          }}
        >
          {loading
            ? "Processing your request..."
            : text || (isRecording
              ? "Listening... Tap to stop"
              : showInput
                ? "Type a message and tap send"
                : "Tap the microphone to start recording!")}
        </Text>
      </View>

      {/* Action Buttons */}
      {AIResponse && (
        <View
          style={{
            position: "absolute",
            bottom: verticalScale(40),
            left: 0,
            paddingHorizontal: scale(30),
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            width: scale(360),
          }}
        >
          <TouchableOpacity onPress={() => sendToGpt(text)}>
            <Regenerate />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => speakText(text)}>
            <Reload />
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#131313",
  },
  userHeader: {
    position: "absolute",
    top: verticalScale(50),
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(20),
    zIndex: 10,
  },
  backButton: {
    padding: scale(8),
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  userAvatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(10),
  },
  userDetails: {
    alignItems: "flex-start",
  },
  userGreeting: {
    color: "#fff",
    fontSize: scale(14),
    fontWeight: "500",
  },
  userEmail: {
    color: "rgba(255,255,255,0.7)",
    fontSize: scale(12),
  },
  logoutButton: {
    padding: scale(8),
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: scale(25),
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    width: scale(300),
    marginBottom: verticalScale(20),
  },
  textInput: {
    flex: 1,
    color: "#fff",
    fontSize: scale(14),
    maxHeight: scale(80),
  },
  sendButton: {
    backgroundColor: Colors?.primary || "#6366F1",
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    justifyContent: "center",
    alignItems: "center",
    marginLeft: scale(8),
  },
});