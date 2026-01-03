export interface Property {
  reference: string;
  price: number;
  priceMax?: number;
  currency: string;
  location: string;
  province: string;
  bedrooms: number;
  bathrooms: number;
  builtArea: number;
  plotArea?: number;
  propertyType: string;
  mainImage: string;
  images: string[];
  description: string;
  features: string[];
  pool?: string;
  garden?: string;
  parking?: string;
  orientation?: string;
  views?: string;
}

export interface PropertySearchParams {
  reference?: string;
  location?: string;
  sublocation?: string;
  priceMin?: number;
  priceMax?: number;
  propertyType?: string;
  transactionType?: 'sale' | 'rent';
  bedrooms?: number;
  bathrooms?: number;
  newDevs?: 'only' | '';
  page?: number;
  limit?: number;
}

export interface PropertySearchResponse {
  properties: Property[];
  total: number;
  page: number;
  limit: number;
}
