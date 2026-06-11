import { AppProvider } from './AppContext';
import ShopScene from './ShopScene';

export default function App() {
  return (
    <AppProvider>
      <ShopScene />
    </AppProvider>
  );
}
