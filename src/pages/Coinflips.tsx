import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, 
  ChevronDown, 
  Plus,
  Clock,
  Search,
  X,
  Hexagon,
  DollarSign,
  Coins,
  Sparkles,
  TrendingUp,
  Zap,
  Star,
  User,
  LogOut,
  Package,
  Loader2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createRoom, listRooms, joinRoom, flipRoom, getRoom } from "@/lib/api";
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

type CoinflipStep = "main" | "create";

const Coinflips = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<CoinflipStep>("main");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemDetails, setItemDetails] = useState<Record<string, RolimonsItem>>({});
  const [rooms, setRooms] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const [flipping, setFlipping] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [selectedSide, setSelectedSide] = useState<"H" | "T">("H");
  const valueTolerance = 0.1; // keep in sync with backend unless fetched

  const [userAvatar, setUserAvatar] = useState<string>("");
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

  const handleCreateCoinflip = () => {
    setStep("create");
    setSelectedItemIds(new Set());
    if (user?.robloxId) {
      fetchInventory();
    }
  };

  const handleCreateRoom = async () => {
    const selected = inventory.filter(i => selectedItemIds.has(i.id));
    const totalValue = selected.reduce((sum, it) => sum + (itemDetails[it.id]?.value || 0), 0);
    setCreating(true);
    try {
      await createRoom({ items: selected.map(i => i.id), totalValue, side: selectedSide }, user?.token, { robloxId: user?.robloxId, robloxName: user?.robloxName });
      const res = await listRooms();
      setRooms(res.data || []);
      toast({ title: "Room created", description: "Waiting for an opponent..." });
      setStep("main");
      setSelectedItemIds(new Set());
    } catch (e: any) {
      toast({ title: "Failed to create room", description: String(e), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    const hostVal = rooms.find(r => r.id === roomId)?.host?.totalValue || 0;
    const selected: InventoryItem[] = [];
    let acc = 0;
    for (const it of inventory) {
      const val = itemDetails[it.id]?.value || 0;
      if (acc < hostVal && val > 0) {
        selected.push(it);
        acc += val;
      }
      if (acc >= hostVal * 0.9) break;
    }
    setJoining(roomId);
    try {
      await joinRoom(roomId, { items: selected.map(i => i.id), totalValue: acc, side: "T" }, user?.token, { robloxId: user?.robloxId, robloxName: user?.robloxName });
      const res = await listRooms();
      setRooms(res.data || []);
      toast({ title: "Joined room", description: "Ready to flip!" });
    } catch (e: any) {
      toast({ title: "Failed to join", description: String(e), variant: "destructive" });
    } finally {
      setJoining(null);
    }
  };

  const handleFlip = async (roomId: string) => {
    setFlipping(roomId);
    try {
      const res = await flipRoom(roomId, user?.token, { robloxId: user?.robloxId, robloxName: user?.robloxName });
      toast({ title: "Flip result", description: `Winner: ${res.data.winnerUserId}` });
      const refreshed = await listRooms();
      setRooms(refreshed.data || []);
    } catch (e: any) {
      toast({ title: "Failed to flip", description: String(e), variant: "destructive" });
    } finally {
      setFlipping(null);
    }
  };

  const handleBackToMain = () => {
    setStep("main");
    setInventory([]);
    setSearchTerm("");
    setItemDetails({});
  };

  const handleLogout = () => {
    logout();
    // You can add navigation here if needed
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

  const fetchUserAvatar = async (userId: string) => {
    try {
      console.log("Fetching avatar for user ID:", userId);
      const url = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=100x100&format=Png&isCircular=true`;
      console.log("Avatar API URL:", url);
      
      const response = await fetch(url);
      console.log("Avatar API response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Avatar API response data:", data);
      
      if (data.data && data.data.length > 0 && data.data[0].imageUrl) {
        console.log("Setting avatar URL:", data.data[0].imageUrl);
        setUserAvatar(data.data[0].imageUrl);
      } else {
        console.log("No avatar data found in response");
        // Fallback to a default Roblox avatar URL
        const fallbackUrl = `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=100&height=100&format=png`;
        console.log("Using fallback avatar URL:", fallbackUrl);
        setUserAvatar(fallbackUrl);
      }
    } catch (error) {
      console.error("Error fetching user avatar:", error);
      // Use fallback avatar on error
      const fallbackUrl = `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=100&height=100&format=png`;
      console.log("Using fallback avatar URL due to error:", fallbackUrl);
      setUserAvatar(fallbackUrl);
    }
  };

  // Fetch user avatar when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.robloxId) {
      fetchUserAvatar(user.robloxId);
      // Also fetch collectible names to improve name resolution
      fetchCollectibleNames(user.robloxId);
    }
  }, [isAuthenticated, user?.robloxId]);

  // Load rooms periodically
  useEffect(() => {
    const load = async () => {
      try {
        const res = await listRooms();
        setRooms(res.data || []);
      } catch (e) {
        console.error("Failed to load rooms", e);
      }
    };
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

    const fetchItemDetails = async (itemIds: string[]) => {
    try {
      console.log("Fetching item details for IDs:", itemIds);
      
      // Try Rolimons API first
      const response = await fetch('https://www.rolimons.com/itemapi/itemdetails');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: RolimonsResponse = await response.json();
      console.log("Rolimons API response:", result);
      
      if (result.success && result.items) {
        const details: Record<string, RolimonsItem> = {};
        
        itemIds.forEach(itemId => {
          const itemData = result.items[itemId];
          console.log(`Looking for item ${itemId}:`, itemData);
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
            console.log(`Found item ${itemId}: ${name}`);
          } else {
            console.log(`Item ${itemId} not found in Rolimons database`);
            // Try to get basic info from Roblox API as fallback
            fetch(`https://economy.roblox.com/v1/assets/${itemId}/details`)
              .then(res => res.json())
              .then(data => {
                if (data.Name) {
                  console.log(`Found item ${itemId} via Roblox API: ${data.Name}`);
                  setItemDetails(prev => ({
                    ...prev,
                    [itemId]: {
                      name: data.Name,
                      acronym: "",
                      rap: 0,
                      value: data.PriceInRobux || 0,
                      demand: 0,
                      trend: 0,
                      projected: 0,
                      hip: 0,
                      base_value: 0,
                      updated: 0
                    }
                  }));
                }
              })
              .catch(err => console.log(`Failed to get item ${itemId} from Roblox API:`, err));
          }
        });
        
        setItemDetails(details);
        console.log("Final item details:", details);
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
        // Convert the API response to our inventory format
        const inventoryItems: InventoryItem[] = Object.entries(result.data)
          .filter(([_, instances]) => instances && instances.length > 0) // Only items with instances
          .map(([itemId, instances]) => ({
            id: itemId,
            name: `Item ${itemId}`, // Will be updated with real names
            value: 0, // Will be updated with real values
            instances: instances,
          }));
        
                 setInventory(inventoryItems);
         console.log("Inventory items:", inventoryItems);
         
         // Fetch item details from Rolimons API
          const itemIds = inventoryItems.map(item => item.id);
         console.log("Item IDs to fetch:", itemIds);
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

  const selectedItems = useMemo(
    () => inventory.filter(i => selectedItemIds.has(i.id)),
    [inventory, selectedItemIds]
  );
  const selectedValue = useMemo(
    () => selectedItems.reduce((sum, it) => sum + (itemDetails[it.id]?.value || 0), 0),
    [selectedItems, itemDetails]
  );

  const toggleSelectItem = (id: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const formatCurrencyShort = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  const handleViewRoom = async (roomId: string) => {
    try {
      const res = await getRoom(roomId);
      const r = res.data;
      toast({
        title: `Room ${roomId.slice(0,6)}`,
        description: r.status === "open" ? "Waiting for an opponent" : r.status === "matched" ? "Ready to flip" : `Finished. Winner: ${r?.result?.winnerUserId}`,
      });
    } catch (e: any) {
      toast({ title: "Failed to view room", description: String(e), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      {step === "main" && (
        <>
          {/* Top Header Section */}
          <div className="border-b border-border/50 p-6 animate-fade-in pt-20">
            <div className="flex justify-between items-start mb-6">
              {/* Left side - Statistics */}
              <div className="space-y-1 animate-slide-in-left">
                <div className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  0 Rooms
                </div>
                <div className="text-lg text-muted-foreground">$0 Value</div>
              </div>
              
              {/* Right side - Items and Filters */}
              <div className="text-right space-y-2 animate-slide-in-right">
                <div className="text-lg">0 Items</div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="bg-secondary/50 border-border/50 text-foreground hover:bg-secondary transition-all duration-300 hover:scale-105">
                    Highest to Lowest
                    <ChevronDown className="w-4 h-4 ml-1 transition-transform duration-300 group-hover:rotate-180" />
                  </Button>
                </div>
              </div>
            </div>
            
                         {/* Action Buttons */}
             <div className="flex gap-3 animate-slide-in-up">
               <Button 
                 onClick={handleCreateCoinflip}
                 className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 hover:scale-105 hover:shadow-lg animate-pulse-glow"
               >
                 <Plus className="w-4 h-4 mr-2 animate-pulse" />
                 Create Coinflip
                </Button>
             </div>
            
            {/* User Info Section */}
            {isAuthenticated && user && (
              <div className="mt-4 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-border/30 animate-fade-in">
                <div className="flex items-center justify-between">
                                     <div className="flex items-center gap-3">
                     {userAvatar ? (
                       <img 
                         src={userAvatar} 
                         alt={`${user.displayName}'s avatar`}
                         className="w-10 h-10 rounded-full border-2 border-primary/20 shadow-lg"
                         onError={(e) => {
                           console.log("Avatar image failed to load:", userAvatar);
                           e.currentTarget.style.display = 'none';
                           e.currentTarget.nextElementSibling?.classList.remove('hidden');
                         }}
                       />
                     ) : null}
                     <div className={`w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center ${userAvatar ? 'hidden' : ''}`}>
                       <User className="w-5 h-5 text-primary-foreground" />
                     </div>
                     <div>
                       <div className="font-semibold text-foreground">{user.displayName}</div>
                       <div className="text-sm text-muted-foreground">@{user.robloxName}</div>
                     </div>
                    <Badge variant="secondary" className="bg-green-500/20 text-green-500 border-green-500/30">
                      Verified
                    </Badge>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleLogout}
                    className="bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/20 transition-all duration-300 hover:scale-105"
                  >
                    <LogOut className="w-4 h-4 mr-1" />
                    Logout
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Main Content Area - Rooms List */}
          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              {rooms.map((room) => (
                <Card key={room.id} className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>Room #{room.id.slice(0, 6)}</span>
                      <Badge variant="secondary">{room.status}</Badge>
                    </CardTitle>
                    <CardDescription>
                      Host: @{room.host?.robloxName} • Value: ${room.host?.totalValue?.toLocaleString?.() || 0}
                    </CardDescription>
                    <CardDescription>
                      Range: {formatCurrencyShort((room.host?.totalValue || 0) * (1 - valueTolerance))} - {formatCurrencyShort((room.host?.totalValue || 0) * (1 + valueTolerance))}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex gap-2">
                    {room.status === "open" && (
                      user?.robloxId === room.host?.userId ? (
                        <Button size="sm" variant="outline" onClick={() => handleViewRoom(room.id)}>View</Button>
                      ) : (
                        <Button size="sm" onClick={() => handleJoinRoom(room.id)} disabled={joining === room.id || loadingInventory}>
                          {joining === room.id ? "Joining..." : "Join"}
                        </Button>
                      )
                    )}
                    {room.status === "matched" && (
                      <Button size="sm" variant="outline" onClick={() => handleFlip(room.id)} disabled={flipping === room.id}>
                        {flipping === room.id ? "Flipping..." : "Flip"}
                      </Button>
                    )}
                    {room.status === "finished" && room.result && (
                      <div className="text-sm text-muted-foreground">
                        Winner: {room.result.winnerUserId}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Empty state */}
            {rooms.length === 0 && (
            <div className="text-center py-12 animate-fade-in">
              <div className="relative mb-8">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary via-accent to-primary rounded-full flex items-center justify-center mb-6 animate-pulse-glow hover:scale-110 transition-all duration-500">
                  <Coins className="w-10 h-10 text-primary-foreground" />
                </div>
                <div className="absolute -top-2 -right-2 animate-bounce">
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                </div>
                <div className="absolute -bottom-2 -left-2 animate-ping">
                  <Star className="w-4 h-4 text-blue-400" />
                </div>
              </div>
              <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-pulse">
                No Active Coinflips
              </h1>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto animate-fade-in-delay">
                There are currently no active coinflip rooms. Create a new room to get started!
              </p>
              <Button 
                onClick={handleCreateCoinflip}
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground transition-all duration-300 hover:scale-105 hover:shadow-xl animate-bounce-in"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Room
              </Button>
            </div>
            )}
                     </div>
         </>
       )}



      {step === "create" && (
        <div className="min-h-[calc(100vh-4rem)] pt-16 bg-gradient-to-br from-background via-background to-muted/20 p-4 animate-fade-in flex items-center justify-center">
          <div className="w-full max-w-4xl mx-auto">
            <Card className="glass-card animate-slide-up border-0 shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm hover:shadow-3xl transition-all duration-500">
              {/* Top Header Section */}
              <CardHeader className="border-b border-border/30 bg-gradient-to-r from-primary/5 to-accent/5">
                <div className="flex items-center justify-between mb-4 animate-slide-in-down">
                  {/* Search Bar */}
                  <div className="flex-1 max-w-md">
                    <div className="relative group">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 group-focus-within:text-primary transition-all duration-300 group-focus-within:scale-110" />
                      <Input
                        placeholder="Search for an item..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-input/30 border-border/30 focus:border-primary focus:bg-input/50 transition-all duration-300 rounded-xl hover:scale-105"
                      />
                    </div>
                  </div>
                  
                  {/* Filter Dropdowns */}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="bg-secondary/30 border-border/30 text-foreground hover:bg-secondary/50 transition-all duration-300 rounded-lg hover:scale-105">
                      Highest to Lowest
                      <ChevronDown className="w-4 h-4 ml-1 transition-transform duration-300 group-hover:rotate-180" />
                    </Button>
                  </div>
                  
                  {/* Close Button */}
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/20 transition-all duration-300 rounded-full ml-2 hover:scale-110 hover:rotate-90"
                    onClick={handleBackToMain}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Currency/Item Display */}
                <div className="flex items-center gap-4 animate-slide-in-up">
                  <div className="flex items-center gap-2 bg-accent/10 rounded-lg px-3 py-2 hover:scale-105 transition-all duration-300">
                    <DollarSign className="w-5 h-5 text-accent animate-pulse" />
                    <span className="text-lg font-bold">0</span>
                  </div>
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground p-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 hover:rotate-12">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>

                              {/* Main Content Area */}
                <CardContent className="p-8">
                  {loadingInventory ? (
                    <div className="text-center py-16 animate-fade-in">
                      <div className="mx-auto w-28 h-28 bg-gradient-to-br from-primary via-accent to-primary rounded-full flex items-center justify-center mb-6 animate-pulse-glow">
                        <Loader2 className="w-14 h-14 text-primary-foreground animate-spin" />
                      </div>
                      <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        Loading Inventory...
                      </h1>
                      <p className="text-muted-foreground mb-8 text-lg">
                        Fetching your items from the marketplace
                      </p>
                    </div>
                  ) : inventory.length > 0 ? (
                    <div className="animate-fade-in">
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-2">Your Inventory</h2>
                        <p className="text-muted-foreground">
                          {inventory.length} items found
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                                                                         {inventory
                          .filter(item => {
                          const realName = getDisplayNameForId(item.id);
                            return realName.toLowerCase().includes(searchTerm.toLowerCase());
                          })
                          .map((item, index) => (
                            <div
                              key={item.id || index}
                            onClick={() => toggleSelectItem(item.id)}
                            className={
                              "bg-secondary/30 border rounded-lg p-4 hover:bg-secondary/50 transition-all duration-300 hover:scale-105 cursor-pointer " +
                              (selectedItemIds.has(item.id) ? " border-primary ring-2 ring-primary/50 " : " border-border/30 ")
                            }
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                                  <Package className="w-6 h-6 text-primary-foreground" />
                                </div>
                                                                 <div className="flex-1 min-w-0">
                                                                       <h3 className="font-semibold text-foreground truncate">
                                      {getDisplayNameForId(item.id)}
                                    </h3>
                                   <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                     <span>Instances: {item.instances?.length || 0}</span>
                                     {itemDetails[item.id]?.value && (
                                       <>
                                         <span>•</span>
                                         <span>Value: ${itemDetails[item.id].value.toLocaleString()}</span>
                                       </>
                                     )}
                                   </div>
                                 </div>
                              {selectedItemIds.has(item.id) ? (
                                <Badge variant="default" className="bg-primary text-primary-foreground">
                                  Selected
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                  Select
                                </Badge>
                              )}
                              </div>
                            </div>
                          ))}
                      </div>
                      
                                             {inventory.filter(item => {
                         const realName = getDisplayNameForId(item.id);
                         return realName.toLowerCase().includes(searchTerm.toLowerCase());
                       }).length === 0 && searchTerm && (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No items match your search</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-16 animate-fade-in">
                      <div className="relative mb-8">
                        <div className="mx-auto w-28 h-28 bg-gradient-to-br from-primary via-accent to-primary rounded-full flex items-center justify-center mb-6 animate-pulse-glow hover:scale-110 transition-all duration-500">
                          <Coins className="w-14 h-14 text-primary-foreground" />
                        </div>
                        <div className="absolute -top-3 -right-3 animate-bounce">
                          <Sparkles className="w-7 h-7 text-yellow-400" />
                        </div>
                        <div className="absolute -bottom-3 -left-3 animate-ping">
                          <Star className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="absolute top-1/2 -right-8 animate-pulse">
                          <Zap className="w-6 h-6 text-purple-400" />
                        </div>
                      </div>
                      <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-pulse">
                        No items!
                      </h1>
                      <p className="text-muted-foreground mb-12 text-xl animate-fade-in-delay">
                        No items found in your inventory
                      </p>
                      <Button 
                        onClick={handleBackToMain}
                        className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground px-12 py-5 rounded-xl text-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-bounce-in"
                      >
                        <Plus className="w-6 h-6 mr-3" />
                        Back to Main
                      </Button>
                    </div>
                  )}
                </CardContent>

              {/* Bottom Action Bar */
              }
              <div className="p-6 border-t border-border/30 bg-gradient-to-r from-muted/20 to-muted/10">
                <div className="flex items-center justify-between animate-slide-in-up">
                  {/* Coinflip Options */}
                  <div className="flex items-center gap-4">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedSide("H")}
                        className={
                          "w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 transform hover:scale-110 " +
                          (selectedSide === "H"
                            ? " bg-yellow-400 text-white ring-2 ring-yellow-300 "
                            : " bg-gray-600 text-white hover:rotate-6 ")
                        }
                        aria-label="Choose Heads"
                      >
                        <span className="font-bold text-sm">H</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSide("T")}
                        className={
                          "w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 transform hover:scale-110 " +
                          (selectedSide === "T"
                            ? " bg-yellow-400 text-white ring-2 ring-yellow-300 "
                            : " bg-gray-700 text-white hover:-rotate-6 ")
                        }
                        aria-label="Choose Tails"
                      >
                        <span className="font-bold text-sm">T</span>
                      </button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Choose your side
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="bg-secondary/30 border-border/30 text-foreground hover:bg-secondary/50 transition-all duration-300 rounded-lg hover:scale-105"
                      onClick={handleBackToMain}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateRoom}
                      disabled={creating || selectedItems.length === 0}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 rounded-lg hover:scale-105"
                    >
                      {creating ? "Creating..." : `Create R$${selectedValue.toLocaleString()}`}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default Coinflips;
