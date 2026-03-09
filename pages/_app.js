import '../styles/globals.css';
import { ObservationsProvider } from '../context/ObservationsContext';

export default function App({ Component, pageProps }) {
  return (
    <ObservationsProvider>
      <Component {...pageProps} />
    </ObservationsProvider>
  );
}
