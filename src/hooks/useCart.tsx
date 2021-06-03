import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

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
      /* procura no array de cart se existe um produto com o codigo igual ao que queremos adicionar */
      const findProductInCart = cart.find(
        (product) => product.id === productId
      );

      if (!findProductInCart) {
        /* se não houver, realiza uma consulta na API passando o id do produto para pegar os detalhes atuais do produto */
        const { data: product } = await api.get<Product>(
          `products/${productId}`
        );
        /* realizar uma consulta na API passando o id do produto para pegar as informações referente ao estoque */
        const { data: stock } = await api.get<Stock>(`stock/${productId}`);

        /* se o estoque do produto em questão for maior que 0 */
        if (stock.amount > 0) {
          /* copiamos o valor de cart, e no objeto do produto, adicionamos o amount: 1 */
          setCart([...cart, { ...product, amount: 1 }]);
          /* persiste no localstorage */
          localStorage.setItem(
            "@RocketShoes:cart",
            JSON.stringify([...cart, { ...product, amount: 1 }])
          );
          toast.success("Produto adicionado com sucesso");
          return;
        }
      }

      if (findProductInCart) {
        const { data: stock } = await api.get(`stock/${productId}`);

        if (stock.amount > findProductInCart.amount) {
          const updatedCart = cart.map((item) =>
            item.id === productId
              ? {
                  ...item,
                  amount: Number(item.amount) + 1,
                }
              : item
          );

          setCart(updatedCart);
          localStorage.setItem(
            "@RocketShoes:cart",
            JSON.stringify(updatedCart)
          );
          return;
        } else {
          toast.error("Quantidade solicitada fora de estoque");
        }
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const findProductInCart = cart.find(
        (product) => product.id === productId
      );

      if (!findProductInCart) {
        toast.error("Erro na remoção do produto");
        return;
      }

      const updatedCart = cart.filter((item) => item.id !== productId);
      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const { data } = await api.get<Stock>(`stock/${productId}`);
      const stockIsNotAvaliable = amount > data.amount;

      if (stockIsNotAvaliable) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const updatedCart = cart.map((cartItem) =>
        cartItem.id === productId
          ? {
              ...cartItem,
              amount: amount,
            }
          : cartItem
      );
      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
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
