var config = {
		apiKey: "AIzaSyANqZXUKnKoHPL2x3inc5HD_6WDi_INVdg",
		authDomain: "quizz-28b5c.firebaseapp.com",
		databaseURL: "https://quizz-28b5c.firebaseio.com",
		projectId: "quizz-28b5c",
		storageBucket: "quizz-28b5c.appspot.com",
		messagingSenderId: "1004264991834"
	};
firebase.initializeApp(config);

function getUiConfig() {
  return {
    // Opens IDP Providers sign-in flow in a popup.
    'signInFlow': 'popup',
    'signInOptions': [
      // TODO(developer): Remove the providers you don't need for your app.
      {
        provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        scopes: ['profile','email']
      },
    ],
    // Terms of service url.
    'tosUrl': 'https://www.google.com'
  };
}

var ui = new firebaseui.auth.AuthUI(firebase.auth());
var database = firebase.database();

var fbInitUI = function(loginCallback)
{
	var conf = getUiConfig();
	conf['callbacks']= {
      // Called when the user has been successfully signed in.
      'signInSuccess': function(user, credential, redirectUrl) {
        loginCallback(user);
        // Do not redirect.
        return false;
      }
    }
	ui.start('#firebaseui-container', conf);
}