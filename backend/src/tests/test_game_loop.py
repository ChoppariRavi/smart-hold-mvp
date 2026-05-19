from playwright.sync_api import sync_playwright
import json

def test_full_game_automation():
    with sync_playwright() as p:
        # We don't even need a visual browser window for API testing; 
        # using requests context is faster and ultra-clean.
        request_context = p.request.new_context(base_url="http://127.0.0.1:8000")
        
        # 1. Step 1: Hit the /deal endpoint
        print("\n[1/3] Triggering /deal endpoint...")
        deal_response = request_context.get("/deal")
        assert deal_response.ok, f"Failed to deal: {deal_response.status}"
        
        deal_data = deal_response.json()
        game_id = deal_data["game_id"]
        hand = deal_data["hand"]
        suggestion = deal_data["coach_suggestion"]
        
        print(f" -> Game ID: {game_id}")
        print(f" -> Dealt Hand: {[{c['value']: c['suit']} for c in hand]}")
        print(f" -> Coach Recommends Holding Indices: {suggestion}")
        
        # 2. Step 2: Use the coach's advice to execute the /draw
        print("[2/3] Sending hold indices to /draw endpoint...")
        draw_payload = {
            "game_id": game_id,
            "hold_indices": suggestion
        }
        
        draw_response = request_context.post("/draw", data=draw_payload)
        assert draw_response.ok, f"Failed to draw: {draw_response.status}"
        
        # 3. Step 3: Validate the final results
        print("[3/3] Checking game results...")
        final_data = draw_response.json()
        
        print(f" -> Final Hand: {[{c['value']: c['suit']} for c in final_data['final_hand']]}")
        print(f" -> Hand Rank Evaluated: {final_data['rank']}")
        print(f" -> Payout Credits: {final_data['payout']}")
        
        # Verify the structure returned is valid
        assert "final_hand" in final_data
        assert "rank" in final_data
        assert "payout" in final_data
        
        print("====== E2E GAME LOOP SUCCESSFUL ======")
        request_context.dispose()

if __name__ == "__main__":
    test_full_game_automation()