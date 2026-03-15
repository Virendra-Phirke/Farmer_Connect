import { useState } from "react";
import { FarmerEquipment } from "@/lib/api/farmer-equipment";
import { useCreateFarmerEquipment } from "@/hooks/useFarmerEquipment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EquipmentListProps {
  profileId: string;
  equipment: FarmerEquipment[];
  isLoading: boolean;
}

export const EquipmentList = ({ profileId, equipment, isLoading }: EquipmentListProps) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<FarmerEquipment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [equipmentName, setEquipmentName] = useState("");
  const [equipmentType, setEquipmentType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [condition, setCondition] = useState("");
  const [purchaseYear, setPurchaseYear] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = useCreateFarmerEquipment();

  const resetForm = () => {
    setEquipmentName("");
    setEquipmentType("");
    setQuantity("");
    setCondition("");
    setPurchaseYear("");
    setDescription("");
  };

  const handleAddEquipment = async () => {
    if (!equipmentName.trim()) {
      toast.error("Equipment name is required");
      return;
    }
    if (!equipmentType || !condition) {
      toast.error("Equipment type and condition are required");
      return;
    }
    if (!quantity || parseInt(quantity) <= 0) {
      toast.error("Quantity must be a positive number");
      return;
    }

    try {
      await createMutation.mutateAsync({
        profileId,
        equipment: {
          equipment_name: equipmentName,
          equipment_type: equipmentType,
          quantity: parseInt(quantity),
          condition: condition,
          purchase_year: purchaseYear ? parseInt(purchaseYear) : undefined,
          description: description || undefined,
        },
      });
      toast.success("Equipment added successfully");
      resetForm();
      setShowAddDialog(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to add equipment");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">My Equipment</h2>
        <Button onClick={() => setShowAddDialog(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Equipment
        </Button>
      </div>

      {equipment.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground border border-dashed rounded-lg">
          No equipment added yet. Click "Add Equipment" to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {equipment.map((item) => (
            <div
              key={item.id}
              className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
              onClick={() => {
                setSelectedEquipment(item);
                setShowDetailModal(true);
              }}
              onMouseEnter={() => {
                setSelectedEquipment(item);
                setShowDetailModal(true);
              }}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{item.equipment_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.equipment_type} • Qty: {item.quantity} • {item.condition}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Equipment Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Equipment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="equipmentName">Equipment Name <span className="text-red-500">*</span></Label>
              <Input
                id="equipmentName"
                value={equipmentName}
                onChange={(e) => setEquipmentName(e.target.value)}
                placeholder="e.g. John Deere Tractor"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipmentType">Equipment Type <span className="text-red-500">*</span></Label>
              <Select value={equipmentType} onValueChange={setEquipmentType}>
                <SelectTrigger id="equipmentType">
                  <SelectValue placeholder="Select equipment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tractor">Tractor</SelectItem>
                  <SelectItem value="plough">Plough</SelectItem>
                  <SelectItem value="harrow">Harrow</SelectItem>
                  <SelectItem value="cultivator">Cultivator</SelectItem>
                  <SelectItem value="sprayer">Sprayer</SelectItem>
                  <SelectItem value="pump">Pump</SelectItem>
                  <SelectItem value="thresher">Thresher</SelectItem>
                  <SelectItem value="harvester">Harvester</SelectItem>
                  <SelectItem value="rotavator">Rotavator</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity <span className="text-red-500">*</span></Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 1"
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">Condition <span className="text-red-500">*</span></Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger id="condition">
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchaseYear">Purchase Year</Label>
              <Input
                id="purchaseYear"
                type="number"
                value={purchaseYear}
                onChange={(e) => setPurchaseYear(e.target.value)}
                placeholder="e.g. 2020"
                min="1980"
                max={new Date().getFullYear()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. In good working condition, recently serviced"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleAddEquipment} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Add Equipment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Equipment Details Modal - Shows on hover/click */}
      {selectedEquipment && (
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedEquipment.equipment_name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Equipment Type</p>
                <p className="text-sm">{selectedEquipment.equipment_type}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Quantity</p>
                <p className="text-sm">{selectedEquipment.quantity}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Condition</p>
                <p className="text-sm">{selectedEquipment.condition}</p>
              </div>

              {selectedEquipment.purchase_year && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Purchase Year</p>
                  <p className="text-sm">{selectedEquipment.purchase_year}</p>
                </div>
              )}

              {selectedEquipment.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-sm">{selectedEquipment.description}</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
};

// Simple ChevronRight icon
function ChevronRight({ className }: { className: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  );
}
