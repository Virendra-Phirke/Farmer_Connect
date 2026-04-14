import { useState } from "react";
import { FarmerEquipment } from "@/lib/api/farmer-equipment";
import { useCreateFarmerEquipment, useDeleteFarmerEquipment, useUpdateFarmerEquipment } from "@/hooks/useFarmerEquipment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Plus, Loader2, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface EquipmentListProps {
  profileId: string;
  equipment: FarmerEquipment[];
  isLoading: boolean;
}

export const EquipmentList = ({ profileId, equipment, isLoading }: EquipmentListProps) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<FarmerEquipment | null>(null);

  const [equipmentName, setEquipmentName] = useState("");
  const [equipmentType, setEquipmentType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [condition, setCondition] = useState("");
  const [purchaseYear, setPurchaseYear] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = useCreateFarmerEquipment();
  const updateMutation = useUpdateFarmerEquipment();
  const deleteMutation = useDeleteFarmerEquipment();

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

  const startEdit = (item: FarmerEquipment) => {
    setEditingEquipment(item);
    setEquipmentName(item.equipment_name || "");
    setEquipmentType(item.equipment_type || "");
    setQuantity(item.quantity?.toString() || "1");
    setCondition(item.condition || "");
    setPurchaseYear(item.purchase_year?.toString() || "");
    setDescription(item.description || "");
    setShowEditDialog(true);
  };

  const handleUpdateEquipment = async () => {
    if (!editingEquipment) return;

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
      await updateMutation.mutateAsync({
        equipmentId: editingEquipment.id,
        profileId,
        updates: {
          equipment_name: equipmentName,
          equipment_type: equipmentType,
          quantity: parseInt(quantity),
          condition,
          purchase_year: purchaseYear ? parseInt(purchaseYear) : undefined,
          description: description || undefined,
        },
      });

      toast.success("Equipment updated successfully");
      setShowEditDialog(false);
      setEditingEquipment(null);
      resetForm();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to update equipment");
    }
  };

  const handleDeleteEquipment = async (equipmentId: string) => {
    const confirmed = window.confirm("Delete this equipment item?");
    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(equipmentId);
      toast.success("Equipment deleted");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to delete equipment");
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
        <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
          {equipment.map((item) => (
            <HoverCard key={item.id} openDelay={120} closeDelay={120}>
              <HoverCardTrigger asChild>
                <div className="relative p-3 md:p-4 border rounded-lg hover:bg-accent cursor-default transition-colors">
                  <div className="pr-14">
                    <h3 className="font-semibold text-sm md:text-base text-wrap-safe leading-snug">{item.equipment_name}</h3>
                    <p className="text-xs md:text-sm text-muted-foreground text-wrap-safe leading-snug">
                      {item.equipment_type} • Qty: {item.quantity}
                    </p>
                  </div>
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(item);
                      }}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteEquipment(item.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </HoverCardTrigger>
              <HoverCardContent align="start" className="w-80">
                <div className="space-y-2">
                  <p className="font-semibold">{item.equipment_name}</p>
                  <p className="text-sm">Type: {item.equipment_type}</p>
                  <p className="text-sm">Quantity: {item.quantity}</p>
                  <p className="text-sm">Condition: {item.condition}</p>
                  {!!item.purchase_year && <p className="text-sm">Purchase Year: {item.purchase_year}</p>}
                  {!!item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                </div>
              </HoverCardContent>
            </HoverCard>
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

      {/* Edit Equipment Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Equipment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editEquipmentName">Equipment Name <span className="text-red-500">*</span></Label>
              <Input id="editEquipmentName" value={equipmentName} onChange={(e) => setEquipmentName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editEquipmentType">Equipment Type <span className="text-red-500">*</span></Label>
              <Select value={equipmentType} onValueChange={setEquipmentType}>
                <SelectTrigger id="editEquipmentType">
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
              <Label htmlFor="editQuantity">Quantity <span className="text-red-500">*</span></Label>
              <Input id="editQuantity" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editCondition">Condition <span className="text-red-500">*</span></Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger id="editCondition">
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
              <Label htmlFor="editPurchaseYear">Purchase Year</Label>
              <Input id="editPurchaseYear" type="number" min="1980" max={new Date().getFullYear()} value={purchaseYear} onChange={(e) => setPurchaseYear(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editDescription">Description</Label>
              <Input id="editDescription" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleUpdateEquipment} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};
