import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Search, Loader2, CheckCircle, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";

interface InventoryItem {
  id: string;
  name: string;
  value: number;
  image?: string;
  rarity?: string;
  instances?: string[];
}

interface InventoryResponse {
  success: boolean;
  data: Record<string, string[]>;
  gamepasses: any[];
}

interface RolimonsItem {
  name: string;
  acronym: string;
  rap: number;
  value: number;
  demand: number;
  trend: number;
  projected: number;
  hip: number;
  base_value: number;
  updated: number;
}

interface RolimonsResponse {
  success: boolean;
  item_count: number;
  items: Record<string, [string, string, number, number, number, number, number, number, number, number]>;
}

export default function Inventory() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemDetails, setItemDetails] = useState<Record<string, RolimonsItem>>({});
  const [collectibleNamesByAssetId, setCollectibleNamesByAssetId] = useState<Record<string, string>>({});
  const [collectibleNamesByUserAssetId, setCollectibleNamesByUserAssetId] = useState<Record<string, string>>({});

  // Simple fallback mapping for common items
  const getItemName = (itemId: string) => {
    const commonItems: Record<string, string> = {
      "1029025": "The Classic ROBLOX Fedora",
      "1031429": "Domino Crown", 
      "1032641": "Princess Hat",
      "1048037": "Bighead",
      "1048338": "Flag",
      "1081239": "Bucket",
      "1082932": "Traffic Cone",
      "1098277": "Santa Hat",
      "1125510": "The Void Star",
      "1158416": "Eerie Pumpkin Head",
      "1172161": "The Bluesteel Bathelm",
      "1193866": "The Crimson Catseye",
      "1235488": "Clockwork's Headphones",
      "1272714": "Wanwood Antlers",
      "1272715": "Helm of the Secret Fire",
      "1279018": "Night Vision Goggles",
      "1285307": "Sparkle Time Fedora",
      "1286490": "The Agonizingly Ugly Bucket of Doom",
      "1323367": "Helm of the Frozen North",
      "1323384": "The Ice Crown",
      "1365767": "Valkyrie Helm",
      "17521857429": "Daemonshank",
      "76233968067050": "Snowflake Eyes",
      "114706745345742": "Frosty Fedora"
    };
    
    return commonItems[itemId] || `Item ${itemId}`;
  };

  // Resolve display name from multiple sources
  const getDisplayNameForId = (id: string) => {
    return (
      itemDetails[id]?.name ||
      collectibleNamesByAssetId[id] ||
      collectibleNamesByUserAssetId[id] ||
      getItemName(id)
    );
  };

  // Fetch owned collectibles from Roblox to map assetId and userAssetId to names
  const fetchCollectibleNames = async (userId: string) => {
    try {
      const url = `https://inventory.roblox.com/v1/users/${userId}/assets/collectibles?limit=100&sortOrder=Desc`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data && Array.isArray(data.data)) {
        const byAsset: Record<string, string> = {};
        const byUaid: Record<string, string> = {};
        for (const item of data.data) {
          if (item.assetId && item.name) byAsset[String(item.assetId)] = item.name;
          if (item.userAssetId && item.name) byUaid[String(item.userAssetId)] = item.name;
        }
        setCollectibleNamesByAssetId(byAsset);
        setCollectibleNamesByUserAssetId(byUaid);
      }
    } catch (e) {
      console.error("Failed to fetch collectible names:", e);
    }
  };

  const fetchItemDetails = async (itemIds: string[]) => {
    try {
      const response = await fetch('https://www.rolimons.com/itemapi/itemdetails');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: RolimonsResponse = await response.json();
      
      if (result.success && result.items) {
        const details: Record<string, RolimonsItem> = {};
        
        itemIds.forEach(itemId => {
          const itemData = result.items[itemId];
          if (itemData) {
            const [name, acronym, rap, value, demand, trend, projected, hip, base_value, updated] = itemData;
            details[itemId] = {
              name,
              acronym,
              rap,
              value,
              demand,
              trend,
              projected,
              hip,
              base_value,
              updated
            };
          }
        });
        
        setItemDetails(details);
      }
    } catch (error) {
      console.error("Error fetching item details:", error);
    }
  };

  const fetchInventory = async () => {
    if (!user?.robloxId) {
      toast({
        title: "Error",
        description: "User ID not found. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    setLoadingInventory(true);
    try {
      const response = await fetch(`http://217.154.94.114/v1/ah/marketplace/GetInventory?id=${user.robloxId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: InventoryResponse = await response.json();
      
      if (result.success && result.data) {
        const inventoryItems: InventoryItem[] = Object.entries(result.data)
          .filter(([_, instances]) => instances && instances.length > 0)
          .map(([itemId, instances]) => ({
            id: itemId,
            name: `Item ${itemId}`,
            value: 0,
            instances: instances,
          }));
        
        setInventory(inventoryItems);
        
        const itemIds = inventoryItems.map(item => item.id);
        await fetchItemDetails(itemIds);
        
        toast({
          title: "Inventory Loaded",
          description: `Found ${inventoryItems.length} items in your inventory`,
        });
      } else {
        setInventory([]);
        toast({
          title: "No Items Found",
          description: "No items found in your inventory",
        });
      }
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast({
        title: "Error",
        description: "Failed to load inventory. Please try again.",
        variant: "destructive",
      });
      setInventory([]);
    } finally {
      setLoadingInventory(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.robloxId) {
      fetchCollectibleNames(user.robloxId);
      fetchInventory();
    }
  }, [isAuthenticated, user?.robloxId]);

  const filteredInventory = inventory.filter(item => {
    const realName = getDisplayNameForId(item.id);
    return realName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalValue = inventory.reduce((sum, item) => sum + (itemDetails[item.id]?.value || 0), 0);

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-20 pb-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Your Inventory</h1>
              <p className="text-muted-foreground">Manage and view your Roblox items</p>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Package className="w-8 h-8 text-primary" />
                  <div>
                    <div className="text-2xl font-bold">{inventory.length}</div>
                    <div className="text-sm text-muted-foreground">Total Items</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-8 h-8 text-green-400" />
                  <div>
                    <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Total Value</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                  <div>
                    <div className="text-2xl font-bold">@{user?.robloxName}</div>
                    <div className="text-sm text-muted-foreground">Verified User</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search your items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-input/50 border-border/50"
            />
          </div>
        </div>

        {/* Content */}
        {loadingInventory ? (
          <div className="text-center py-16">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mb-6 animate-pulse">
              <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Loading Inventory...</h2>
            <p className="text-muted-foreground">Fetching your items from the marketplace</p>
          </div>
        ) : filteredInventory.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInventory.map((item, index) => (
              <Card key={item.id || index} className="glass-card hover:scale-105 transition-transform duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                      <Package className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate text-lg">
                        {getDisplayNameForId(item.id)}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Instances: {item.instances?.length || 0}</span>
                        {itemDetails[item.id]?.value && (
                          <>
                            <span>•</span>
                            <span className="text-green-400 font-semibold">
                              ${itemDetails[item.id].value.toLocaleString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {itemDetails[item.id] && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">RAP:</span>
                        <span>${itemDetails[item.id].rap.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Demand:</span>
                        <Badge variant={itemDetails[item.id].demand > 0 ? "default" : "secondary"}>
                          {itemDetails[item.id].demand}
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : searchTerm ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No items match your search</h3>
            <p className="text-muted-foreground">Try adjusting your search terms</p>
          </div>
        ) : (
          <div className="text-center py-16">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No Items Found</h3>
            <p className="text-muted-foreground">Your inventory appears to be empty</p>
            <Button 
              onClick={fetchInventory} 
              className="mt-4 glow-button"
            >
              Refresh Inventory
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
