"use client";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { DialogModal } from "@veridoctor/design/shared";
import { axiosClient } from "@veridoctor/api-client";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";

type Service = {
  id: string;
  name: string;
  description: string;
  estimated_duration: number;
  currency: string;
  price: string | null;
  price_visible: boolean;
};

export default function Services() {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("KES");
  const [description, setDescription] = useState("");
  const [priceVisible, setPriceVisible] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const userId = useSelector((state: RootState) => state.auth.identity);

  const fetchServices = () => {
    axiosClient
      .get(`provider/${userId}/services`)
      .then((res) => setServices(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    if (userId) fetchServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const resetForm = () => {
    setName("");
    setDuration("");
    setPrice("");
    setCurrency("KES");
    setDescription("");
    setPriceVisible(true);
  };

  // Send null when price is empty so the backend stores it as NULL,
  // not as an empty string (which would fail DecimalField validation).
  const pricePayload = (raw: string) => (raw.trim() === "" ? null : raw);

  const handleSave = () => {
    axiosClient
      .post(`provider/${userId}/services`, {
        name,
        estimated_duration: duration,
        price: pricePayload(price),
        currency,
        description,
        price_visible: priceVisible,
      })
      .then((res) => {
        if (res.status === 201) {
          toast.success("Service added successfully");
          resetForm();
          fetchServices();
        }
      })
      .catch(() => toast.error("There was a problem adding the service"));
  };

  const handleUpdate = () => {
    if (!editingService) return;
    axiosClient
      .patch(`provider/${userId}/services/${editingService.id}`, {
        name,
        estimated_duration: duration,
        price: pricePayload(price),
        currency,
        description,
        price_visible: priceVisible,
      })
      .then((res) => {
        if (res.status === 200) {
          toast.success("Service updated successfully");
          setEditingService(null);
          setShowEditModal(false);
          fetchServices();
        }
      })
      .catch(() => toast.error("Could not update service"));
  };

  const handleDelete = () => {
    if (!deletingService) return;
    axiosClient
      .delete(`provider/${userId}/services/${deletingService.id}`)
      .then(() => {
        toast.success("Service deleted");
        setDeletingService(null);
        fetchServices();
      })
      .catch(() => toast.error("Could not delete service"));
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setName(service.name);
    setDuration(String(service.estimated_duration));
    setPrice(service.price ?? "");
    setCurrency(service.currency);
    setDescription(service.description);
    setPriceVisible(service.price_visible ?? true);
    setShowEditModal(true);
    setOpenMenuId(null);
  };

  // How to display a service's price on the card
  const displayPrice = (service: Service) => {
    if (!service.price || service.price === "0.00") {
      return <span className="text-gray-400 italic">Price negotiable</span>;
    }
    if (!service.price_visible) {
      return <span className="text-gray-400 italic">Price hidden</span>;
    }
    return `${service.currency} ${service.price}`;
  };

  const PriceVisibilityField = ({
    value,
    onChange,
  }: {
    value: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <div>
      <label className="text-sm font-medium">Price visibility</label>
      <select
        value={value ? "public" : "private"}
        onChange={(e) => onChange(e.target.value === "public")}
        className="w-full p-2 border border-gray-300 rounded mt-1 text-sm"
      >
        <option value="public">
          Public — visible to patients when booking
        </option>
        <option value="private">Private — hidden from patients</option>
      </select>
    </div>
  );

  return (
    <div className="p-4 bg-white rounded-lg">
      {/* Delete confirmation modal */}
      {deletingService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="font-bold text-lg mb-2">Delete service?</h3>
            <p className="text-gray-600 text-sm mb-6">
              Are you sure you want to delete{" "}
              <span className="font-medium">{deletingService.name}</span>? This
              action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingService(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEditModal && editingService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="font-bold text-lg mb-4">Edit service</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm font-medium">Name of service</label>
                <input
                  defaultValue={editingService.name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Estimated duration (minutes)
                </label>
                <input
                  defaultValue={editingService.estimated_duration}
                  onChange={(e) => setDuration(e.target.value)}
                  type="number"
                  className="w-full p-2 border border-gray-300 rounded mt-1"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">
                    Price{" "}
                    <span className="text-gray-400 font-normal text-xs">
                      (optional — leave blank if negotiable)
                    </span>
                  </label>
                  <input
                    defaultValue={editingService.price ?? ""}
                    onChange={(e) => setPrice(e.target.value)}
                    type="number"
                    min="0"
                    placeholder="e.g. 1500"
                    className="w-full p-2 border border-gray-300 rounded mt-1"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium">Currency</label>
                  <input
                    defaultValue={editingService.currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  defaultValue={editingService.description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded mt-1"
                />
              </div>
              <PriceVisibilityField
                value={priceVisible}
                onChange={setPriceVisible}
              />
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingService(null);
                }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold">Service catalog</h1>
          <p className="text-gray-600 mt-1">Manage services.</p>
        </div>
        <DialogModal
          title="Add a new service"
          description="Add a new service to your service listing"
          trigger={<p>Add service</p>}
          onSave={handleSave}
        >
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-sm font-medium">Name of service</label>
              <input
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                Estimated duration (minutes)
              </label>
              <input
                onChange={(e) => setDuration(e.target.value)}
                type="number"
                className="w-full p-2 border border-gray-300 rounded mt-1"
                placeholder="e.g. 30"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium">
                  Price{" "}
                  <span className="text-gray-400 font-normal text-xs">
                    (optional — leave blank if negotiable)
                  </span>
                </label>
                <input
                  onChange={(e) => setPrice(e.target.value)}
                  type="number"
                  min="0"
                  placeholder="e.g. 1500"
                  className="w-full p-2 border border-gray-300 rounded mt-1"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">Currency</label>
                <input
                  onChange={(e) => setCurrency(e.target.value)}
                  defaultValue="KES"
                  className="w-full p-2 border border-gray-300 rounded mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded mt-1"
              />
            </div>
            <PriceVisibilityField
              value={priceVisible}
              onChange={setPriceVisible}
            />
          </div>
        </DialogModal>
      </div>

      {/* Service cards */}
      {services.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">
            No services yet. Add your first service above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <div
              key={service.id}
              className="border border-gray-200 rounded-lg p-4 relative"
            >
              {/* 3-dot menu */}
              <div
                className="absolute top-3 right-3"
                ref={openMenuId === service.id ? menuRef : null}
              >
                <button
                  onClick={() =>
                    setOpenMenuId(
                      openMenuId === service.id ? null : service.id
                    )
                  }
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-lg leading-none"
                >
                  ···
                </button>
                {openMenuId === service.id && (
                  <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                    <button
                      onClick={() => handleEdit(service)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setDeletingService(service);
                        setOpenMenuId(null);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <h3 className="font-bold pr-8">{service.name}</h3>
              {service.description && (
                <p className="text-sm text-gray-600 mt-1">
                  {service.description}
                </p>
              )}
              <p className="text-sm mt-2 text-gray-500">
                {service.estimated_duration} mins
              </p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-sm font-medium text-gray-700">
                  {displayPrice(service)}
                </p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    service.price_visible
                      ? "bg-green-50 text-green-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {service.price_visible ? "Public" : "Private"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

