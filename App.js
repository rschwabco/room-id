import { Camera, CameraType } from "expo-camera";
import { useState, useEffect, useRef } from "react";
import { Button, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import io from "socket.io-client";

export default function App() {
  const [type, setType] = useState(CameraType.back);
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [hasConnection, setConnection] = useState(true);
  const ENDPOINT = "https://old-showers-sort-97-113-152-235.loca.lt";

  let socket = useRef(null);

  useEffect(
    function didMount() {
      socket.current = io(ENDPOINT, {
        transports: ["websocket"],
      });

      socket.current.io.on("open", () => setConnection(true));
      socket.current.io.on("close", () => setConnection(false));

      // socket.on("time-msg", (data) => {
      //   setTime(new Date(data.time).toString());
      // });

      return function didUnmount() {
        // socket.current.disconnect();
        // socket.current.removeAllListeners();
      };
    },
    [ENDPOINT]
  );

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
    const pic = await this.camera.takePictureAsync({
      base64: true,
    });
    hasConnection &&
      socket.current.emit("picture", {
        data: pic.base64,
        height: pic.height,
        width: pic.width,
      });
  }

  // a function that will take a picture every 3 seconds

  async function takePicRecursively() {
    if (!cameraReady) {
      return;
    }
    const pic = await this.camera.takePictureAsync();
    console.log(pic.uri);
    setTimeout(takePicRecursively, 3000);
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
          ref={(ref) => {
            this.camera = ref;
          }}
        >
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => takePicture()}
            >
              <Text style={styles.text}>Rec</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={toggleCameraType}>
              <Text style={styles.text}>Flip Camera</Text>
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
