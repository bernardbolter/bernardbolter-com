// categories interface
interface Category {
  id: number;
  slug: string;
  name: string;
  color: string;
}

interface Categories {
  categories: Category[];
}
