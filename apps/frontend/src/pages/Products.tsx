import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, Package, Filter, AlertTriangle, TrendingUp, Edit, RefreshCw, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProducts, useCreateProduct, useUpdateProductStock, useUpdateProduct, useProductsRealtime } from '@/hooks/api';
import { BulkUploadDialog } from '@/components/bulk-upload/BulkUploadDialog';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Product, ProductCategory } from '@/types';

const productCategories: ProductCategory[] = ['Seeds', 'Fertilizers', 'Agrochemicals', 'Animal Feeds & Supplements', 'Services', 'Equipment', 'Others'];

export function Products() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockUpdate, setStockUpdate] = useState({ quantity: 0, type: 'add' as 'add' | 'subtract' });
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Seeds' as ProductCategory,
    buyingPrice: 0,
    sellingPrice: 0,
    inStock: 0,
    description: '',
  });
  // API hooks
  const { data: products = [], isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const updateStock = useUpdateProductStock();
  
  // Enable real-time updates
  useProductsRealtime();

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });
  const lowStockProducts = products.filter(p => p.inStock < 100);
  const totalValue = products.reduce((acc, p) => acc + (p.inStock * p.unitPrice), 0);
  const categories = [...new Set([...productCategories, ...products.map(p => p.category)])];
  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      category: 'Seeds',
      buyingPrice: 0,
      sellingPrice: 0,
      inStock: 0,
      description: '',
    });
  };
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', notation: value >= 1000000 ? 'compact' : 'standard' }).format(value);
  };
  const getStockStatus = (stock: number) => {
    if (stock < 50) return { variant: 'destructive' as const, label: 'Critical' };
    if (stock < 100) return { variant: 'warning' as const, label: 'Low' };
    return { variant: 'success' as const, label: 'In Stock' };
  };
  const handleAddProduct = () => {
    if (!formData.name || !formData.sellingPrice) {
      toast.error('Please fill in name and selling price');
      return;
    }
    if (formData.buyingPrice > formData.sellingPrice) {
      toast.error('Selling price must be greater than buying price');
      return;
    }
    createProduct.mutate({
      name: formData.name,
      category: formData.category,
      description: formData.description || undefined,
      buying_price: formData.buyingPrice,
      selling_price: formData.sellingPrice,
      stock_quantity: formData.inStock,
    });
    setIsAddDialogOpen(false);
    resetForm();
  };
  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      category: product.category as ProductCategory,
      buyingPrice: (product as any).buyingPrice ?? (product as any).buying_price ?? 0,
      sellingPrice: (product as any).sellingPrice ?? product.unitPrice ?? 0,
      inStock: product.inStock,
      description: product.description || '',
    });
    setIsEditDialogOpen(true);
  };
  const handleUpdateProduct = () => {
    if (!selectedProduct) return;
    if (formData.buyingPrice > formData.sellingPrice) {
      toast.error('Selling price must be greater than buying price');
      return;
    }
    updateProduct.mutate({
      id: selectedProduct.id,
      data: {
        name: formData.name,
        category: formData.category,
        description: formData.description || undefined,
        buying_price: formData.buyingPrice,
        selling_price: formData.sellingPrice,
        stock_quantity: formData.inStock,
      }
    });
    setIsEditDialogOpen(false);
    setSelectedProduct(null);
    resetForm();
  };
  const handleOpenStockDialog = (product: Product) => {
    setSelectedProduct(product);
    setStockUpdate({ quantity: 0, type: 'add' });
    setIsStockDialogOpen(true);
  };
  const handleUpdateStock = () => {
    if (!selectedProduct || stockUpdate.quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    if (stockUpdate.type === 'subtract' && stockUpdate.quantity > selectedProduct.inStock) {
      toast.error('Cannot remove more than available');
      return;
    }
    const newStock = stockUpdate.type === 'add'
      ? selectedProduct.inStock + stockUpdate.quantity
      : Math.max(0, selectedProduct.inStock - stockUpdate.quantity);
    updateStock.mutate({
      id: selectedProduct.id,
      stock: newStock
    });
    toast.success(`Stock ${stockUpdate.type === 'add' ? 'added' : 'removed'} successfully`);
    setIsStockDialogOpen(false);
    setSelectedProduct(null);
  };
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground">
            {user?.role === 'admin' ? 'Manage catalog & stock' : 'View product catalog'}
          </p>
        </div>
        {user?.role === 'admin' && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsBulkUploadOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Bulk Upload
            </Button>
            <Button variant="forest" size="sm" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>
        )}
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4" variant="forest">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
              <Package className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold font-heading">{products.length}</p>
              <p className="text-xs sm:text-sm opacity-80">Products</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-accent-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-base sm:text-2xl font-bold font-heading text-accent-foreground truncate">{formatCurrency(totalValue)}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Stock Value</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-700" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold font-heading text-amber-700">{lowStockProducts.length}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Low Stock</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold font-heading text-emerald-700">{categories.length}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Categories</p>
            </div>
          </div>
        </Card>
      </div>
      {/* Search and Filter */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {filteredProducts.map((product, index) => {
          const stockStatus = getStockStatus(product.inStock);
          return (
            <Card
              key={product.id}
              variant="elevated"
              className="animate-fade-in overflow-hidden"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="h-24 sm:h-32 bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10 flex items-center justify-center">
                <Package className="w-12 h-12 sm:w-16 sm:h-16 text-primary/30" />
              </div>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <Badge variant="outline" className="text-xs">{product.category}</Badge>
                  <Badge variant={stockStatus.variant} className="text-xs">{stockStatus.label}</Badge>
                </div>
                <h3 className="font-heading font-semibold mb-1 text-sm sm:text-base line-clamp-1">{product.name}</h3>
                <p className="text-xs text-muted-foreground mb-3 sm:mb-4">SKU: {product.sku}</p>
                <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Buying Price:</span>
                    <span className="font-medium">{formatCurrency((product as any).buyingPrice ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Selling Price:</span>
                    <span className="font-semibold text-primary">{formatCurrency(product.unitPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Profit / unit:</span>
                    <span className="font-medium text-emerald-600">{formatCurrency((product as any).profitPerUnit ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">In Stock:</span>
                    <span className="font-medium">{product.inStock} units</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 sm:mt-4 line-clamp-2">{product.description}</p>
                {user?.role === 'admin' && (
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs h-8 sm:h-9" onClick={() => handleEditProduct(product)}>
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button variant="forest" size="sm" className="flex-1 text-xs h-8 sm:h-9" onClick={() => handleOpenStockDialog(product)}>
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Update Stock
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      {/* Add Product Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>Add a new product to the catalog.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Maize Seeds (10kg)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SKU *</Label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="e.g., MS-001"
                />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: ProductCategory) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {productCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Buying Price (KES) *</Label>
                <Input
                  type="number"
                  value={formData.buyingPrice}
                  onChange={(e) => setFormData({ ...formData, buyingPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Selling Price (KES) *</Label>
                <Input
                  type="number"
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            {formData.sellingPrice > 0 && (
              <p className="text-xs text-muted-foreground">
                Profit per unit: KES {Math.max(formData.sellingPrice - formData.buyingPrice, 0).toLocaleString()} · TOT 40% / Regional 50% / Local 10%
              </p>
            )}
            <div className="space-y-2">
              <Label>Initial Stock</Label>
              <Input
                type="number"
                value={formData.inStock}
                onChange={(e) => setFormData({ ...formData, inStock: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Product description..."
                rows={3}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button variant="forest" className="flex-1" onClick={handleAddProduct}>
                Add Product
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update product information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SKU *</Label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: ProductCategory) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {productCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Buying Price (KES) *</Label>
                <Input
                  type="number"
                  value={formData.buyingPrice}
                  onChange={(e) => setFormData({ ...formData, buyingPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Selling Price (KES) *</Label>
                <Input
                  type="number"
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            {formData.sellingPrice > 0 && (
              <p className="text-xs text-muted-foreground">
                Profit per unit: KES {Math.max(formData.sellingPrice - formData.buyingPrice, 0).toLocaleString()} · TOT 40% / Regional 50% / Local 10%
              </p>
            )}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => { setIsEditDialogOpen(false); setSelectedProduct(null); resetForm(); }}>
                Cancel
              </Button>
              <Button variant="forest" className="flex-1" onClick={handleUpdateProduct}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Update Stock Dialog */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Stock</DialogTitle>
            <DialogDescription>
              {selectedProduct?.name} - Current stock: {selectedProduct?.inStock} units
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Operation</Label>
              <Select
                value={stockUpdate.type}
                onValueChange={(value: 'add' | 'subtract') => setStockUpdate({ ...stockUpdate, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Stock</SelectItem>
                  <SelectItem value="subtract">Remove Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                value={stockUpdate.quantity}
                onChange={(e) => setStockUpdate({ ...stockUpdate, quantity: parseInt(e.target.value) || 0 })}
                min={1}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => { setIsStockDialogOpen(false); setSelectedProduct(null); }}>
                Cancel
              </Button>
              <Button variant="forest" className="flex-1" onClick={handleUpdateStock}>
                Update Stock
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <BulkUploadDialog
        open={isBulkUploadOpen}
        onOpenChange={setIsBulkUploadOpen}
        entityType="products"
        onUpload={async (data) => {
          const productsToInsert = data.map(row => {
            const selling = Number(row.selling_price ?? row.unit_price) || 0;
            return {
              name: String(row.name),
              category: String(row.category || 'Others'),
              description: row.description ? String(row.description) : null,
              buying_price: Number(row.buying_price) || 0,
              selling_price: selling,
              unit_price: selling,
              stock_quantity: Number(row.stock_quantity) || 0,
            };
          });
          
          const { error } = await supabase.from('products').insert(productsToInsert);
          if (error) throw error;
        }}
      />
    </div>
  );
}
