import wixLocation from 'wix-location';
import wixData from 'wix-data';
import { memory } from 'wix-storage';

$w.onReady(async function () {
    console.log("🚀 Page 3 loaded.");
    $w('#nextButton').disable();
    $w('#errorMessage').hide();

    // Retrieve Trust Name from memory (must exist from Page 1)
    let trustName = memory.getItem("trustName");
    if (!trustName) {
        console.error("❌ Trust Name missing from memory.");
        return;
    }
    console.log("✅ Trust Name retrieved:", trustName);

    // Retrieve stored Email & Address fields
    let storedEmail = memory.getItem("email") || "";
    let storedAddress = JSON.parse(memory.getItem("address") || "{}");

    // Fetch existing data from database
    let existingRecord;
    try {
        let queryResult = await wixData.query("LandingPageUserSubmissions")
            .eq("trustName", trustName) // Fetch the correct row
            .find();

        if (queryResult.items.length > 0) {
            existingRecord = queryResult.items[0];
            console.log("✅ Existing record found:", existingRecord);

            // Auto-fill input fields but prioritize memory storage
            if (!storedEmail && existingRecord.email) {
                storedEmail = existingRecord.email;
                memory.setItem("email", existingRecord.email);
            }
            if (!storedAddress && existingRecord.address) {
                storedAddress = existingRecord.address;
                memory.setItem("address", existingRecord.address);
            }
        } else {
            console.error("❌ ERROR: No existing record found for Trust Name:", trustName);
        }
    } catch (error) {
        console.error("❌ Database Query Error:", error.message);
    }

    // Set values in the fields and validate them
    $w('#emailInput').value = storedEmail;
    if (storedAddress) {
        try {
            // Convert stored string into a valid Address object
            $w('#addressInput').value = { formatted: storedAddress };
            console.log("✅ Address assigned successfully:", $w('#addressInput').value);
        } catch (error) {
            console.error("❌ Address assignment error:", error);
        }
    }
    validateFields();

    function validateFields() {
        console.log("🔍 Running validateFields()..."); // Debugging log
        const email = $w('#emailInput').value.trim();
        const address = $w('#addressInput').value?.formatted || ""; // Extracts formatted address safely
        const addressObject = $w('#addressInput').value;
        const addressString = addressObject && typeof addressObject === "object" ? addressObject.formatted || "" : "";
        const trimmedAddress = addressString.trim();

        console.log(trimmedAddress);

        console.log("📩 Email:", email);
        console.log("📍 Address:", address);

        if (email !== "" && address.trim() !== "") { // Ensure it's a valid string
            console.log("✅ Inputs detected. Enabling Next Button.");
            $w('#nextButton').enable();
        } else {
            console.log("⚠️ Inputs missing. Disabling Next Button.");
            $w('#nextButton').disable();
        }

    }

    $w('#emailInput').onInput(() => {
        memory.setItem("email", $w('#emailInput').value.trim());
        validateFields();
    });

    $w('#addressInput').onChange(() => {
        console.log("🏠 Address selected:", $w('#addressInput').value);
        const addressObject = $w('#addressInput').value;
        const addressString = addressObject?.formatted || ""; // Extract formatted address safely
        memory.setItem("address", addressString.trim()); // ✅ Now it's a proper string
        validateFields();
    });

    function showError(message) {
        console.error("❌ ERROR:", message);
        $w('#errorMessage').text = message;
        $w('#errorMessage').show();
    }

    function hideError() {
        $w('#errorMessage').hide();
    }

    async function submitDataAndNavigate(destination) {
        const email = $w('#emailInput').value.trim();
        const address = $w('#addressInput').value?.formatted || "";

        if (email === "" || address === "") {
            showError("Error: Both Email and Address are required.");
            return;
        }

        console.log("📩 Saving Email & Address:", email, address);
        memory.setItem("email", email);
        const addressObject = $w('#addressInput').value;
        if (addressObject && typeof addressObject === "object") {
            memory.setItem("address", JSON.stringify(addressObject)); // Store full object
        }

        try {
            let existingRecord = await wixData.query("LandingPageUserSubmissions")
                .eq("trustName", trustName) // Ensure we get the correct row
                .find();

            if (existingRecord.items.length > 0) {
                let existingId = existingRecord.items[0]._id;
                let updatedData = {
                    _id: existingId,
                    trustName, // Preserve trust name
                    email,
                    address,
                    ...existingRecord.items[0] // Preserve other fields to prevent data loss
                };

                console.log("🔄 Updating existing record:", updatedData);
                await wixData.update("LandingPageUserSubmissions", updatedData);

                console.log("✅ Data saved. Navigating to:", destination);
                await new Promise(resolve => setTimeout(resolve, 300)); // Short delay ensures DB updates complete
                wixLocation.to(destination);
            } else {
                console.error("❌ ERROR: No existing record found for Trust Name:", trustName);
                showError("Error: Data inconsistency detected. Please restart the process.");

                // Log issue in errorLog field
                await wixData.insert("LandingPageUserSubmissions", {
                    trustName,
                    errorLog: "ERROR: No existing row found on Page 3."
                });
            }
        } catch (error) {
            let errorMessage = `Database error: ${error.message}`;
            showError(errorMessage);

            // Log error in the database
            try {
                let existingRecord = await wixData.query("LandingPageUserSubmissions")
                    .eq("trustName", trustName)
                    .find();

                if (existingRecord.items.length > 0) {
                    let existingId = existingRecord.items[0]._id;
                    await wixData.update("LandingPageUserSubmissions", {
                        _id: existingId,
                        errorLog: errorMessage
                    });
                    console.log("📝 Error logged in existing entry.");
                } else {
                    await wixData.insert("LandingPageUserSubmissions", {
                        trustName,
                        errorLog: errorMessage
                    });
                    console.log("📝 Error logged as new entry.");
                }
            } catch (logError) {
                console.error("❌ Failed to log error in database:", logError.message);
            }
        }
    }

    // ✅ Next and Back buttons now use the same logic, only page destination changes
    $w('#nextButton').onClick(() => submitDataAndNavigate("/signup-Zba3"));
    $w('#backButton').onClick(() => submitDataAndNavigate("/signup-Zba1"));
});