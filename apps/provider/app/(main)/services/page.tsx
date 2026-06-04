"use client";
import { DialogModal } from "@veridoctor/design/shared";
import { toast } from "sonner";

export default function Services() {
  return (
    <div className="p-4 bg-white rounded-lg mx-4">
      <div className="flex justify-between">
        <div>
          <h1 className="text-xl font-bold">Service catalog</h1>
          <p className="text-gray-600 mt-2">Manage services.</p>
        </div>
        <DialogModal
          title="Add a new service"
          description="Add a new service to your service listing"
          trigger={<p>Add service</p>}
          onSave={() => {
            toast.error("There was a problem adding the service");
          }}
        >
          <form>
            <label>Name of service</label>
            <input className="w-full p-2 border border-gray-300 rounded"></input>
            <label>Estimated duration (minutes)</label>
            <input
              type="number"
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="An estimated duration this service will take"
            ></input>
            <div className="flex gap-4">
              <div>
                <label>Price</label>
                <input className="w-full p-2 border border-gray-300 rounded"></input>
              </div>
              <div>
                <label>Currency</label>
                <input
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="KES"
                ></input>
              </div>
            </div>
            <label>Description</label>
            <textarea className="w-full p-2 border border-gray-300 rounded"></textarea>
          </form>
        </DialogModal>
      </div>
    </div>
  );
}
