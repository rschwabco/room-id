import { Camera, CameraType } from "expo-camera";
import { useState, useEffect, useRef } from "react";
import { Button, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import io from "socket.io-client";
import { manipulateAsync, FlipType, SaveFormat } from "expo-image-manipulator";

export default function App() {
  const [type, setType] = useState(CameraType.back);
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [hasConnection, setConnection] = useState(true);
  const ENDPOINT = "https://public-deer-start-97-113-152-235.loca.lt";
  const interval = 2000;

  let intervalId = useRef(null);
  let socket = useRef(null);
  const cameraRef = useRef(null);

  useEffect(
    function didMount() {
      socket.current = io(ENDPOINT, {
        transports: ["websocket"],
      });

      socket.current.io.on("open", () => setConnection(true));
      socket.current.io.on("close", () => setConnection(false));

      return function didUnmount() {
        // socket.current.disconnect();
        // socket.current.removeAllListeners();
      };
    },
    [ENDPOINT]
  );

  useEffect(() => {
    console.log("recording", recording);
    if (!cameraReady) {
      return;
    }
    if (recording && !intervalId.current) {
      intervalId.current = setInterval(takePicture, interval);
    } else {
      if (!recording && intervalId.current) {
        console.log("stopped", recording, intervalId.current);
        clearInterval(intervalId.current);
      }
    }
  }, [recording]);

  if (!permission) {
    // Camera permissions are still loading
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: "center" }}>
          We need your permission to show the camera
        </Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  async function takePicture() {
    if (!cameraReady) {
      return;
    }
    const pic = await cameraRef.current?.takePictureAsync({
      base64: true,
    });
    const resizedPic = await manipulateAsync(
      pic.uri,
      [{ resize: { width: pic.width / 10, height: pic.height / 10 } }],
      { compress: 1, format: SaveFormat.JPEG, base64: true }
    );

    hasConnection &&
      socket.current.emit("picture", {
        uri: pic.uri,
        data: resizedPic.base64,
        height: resizedPic.height,
        width: resizedPic.width,
      });
  }

  function toggleRecording() {
    setRecording(!recording);
  }

  function toggleCameraType() {
    setType((current) =>
      current === CameraType.back ? CameraType.front : CameraType.back
    );
  }

  return (
    <View style={styles.container}>
      {!hasConnection && (
        <>
          <Text style={styles.paragraph}>Connecting to {ENDPOINT}...</Text>
          <Text style={styles.footnote}>
            Make sure the backend is started and reachable
          </Text>
        </>
      )}

      {hasConnection && (
        <Camera
          style={styles.camera}
          type={type}
          onCameraReady={() => setCameraReady(true)}
          ref={cameraRef}
        >
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => toggleRecording()}
            >
              <Text style={styles.text}>Rec</Text>
            </TouchableOpacity>
          </View>
        </Camera>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "transparent",
    margin: 64,
  },
  button: {
    flex: 1,
    alignSelf: "flex-end",
    alignItems: "center",
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
});
