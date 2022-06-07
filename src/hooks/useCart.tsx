import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const mutableCart = cart.map(product => product);
      const product = await (await api.get(`/products/${productId}`)).data;
      const productStock: Stock = await (await api.get(`/stock/${productId}`)).data;
      const productHasStock = productStock.amount > 0;

      const productIndex = mutableCart.findIndex(({ id }) => id === productId);
      const productExistsInCart = productIndex !== -1;

      if (productExistsInCart) {
        if (productStock.amount > mutableCart[productIndex].amount) {
          mutableCart[productIndex] = {
            ...mutableCart[productIndex],
            amount: mutableCart[productIndex].amount + 1
          };
          setCart([...mutableCart]);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(mutableCart));
          return
        }

        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      if (productHasStock) {
        mutableCart.push({ ...product, amount: 1 })
        setCart([...mutableCart]);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(mutableCart));
        return
      }

      toast.error('Quantidade solicitada fora de estoque');
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const mutableCart = cart.map(product => product);
      const productIndex = mutableCart.findIndex(({ id }) => id === productId);
      
      mutableCart[productIndex].amount -= 1;
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(mutableCart));
      return
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const mutableCart = cart.map(product => product);
      const productStock: Stock = await (await api.get(`/stock/${productId}`)).data;
      const productIndex = mutableCart.findIndex(({ id }) => id === productId);
      const productDoesNotExist = productIndex === -1;

      if (productDoesNotExist) {
        toast.error('Erro na alteração de quantidade do produto');
        return
      }

      if (amount > productStock.amount || amount <= 0) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      mutableCart[productIndex] = { ...mutableCart[productIndex], amount};
      setCart([...mutableCart]);
      
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(mutableCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
