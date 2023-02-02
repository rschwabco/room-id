import * as AppleAuthentication from "expo-apple-authentication";
import { StyleSheet, View, Text } from "react-native";
import { useState } from "react";

import Vision from "./Vision";

export default function App() {
  const [credential, setCredential] = useState(null);
  return (
    <View style={{ flex: 1 }}>
      {credential ? (
        <Vision user={credential.user || true} />
      ) : (
        <View style={styles.buttonContainer}>
          <Text
            style={{
              fontSize: 40,
              marginBottom: 20,
            }}
          >
            Pinecone Vision
          </Text>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            }
            buttonStyle={
              AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={5}
            style={styles.button}
            onPress={async () => {
              try {
                const creds = await AppleAuthentication.signInAsync({
                  requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                  ],
                });
                // signed in
                setCredential(creds);
              } catch (e) {
                if (e.code === "ERR_CANCELED") {
                  // handle that the user canceled the sign-in flow
                } else {
                  // handle other errors
                }
              }
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  //Justify content center
  buttonContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    width: 200,
    height: 44,
  },
});
